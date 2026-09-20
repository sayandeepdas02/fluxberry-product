import type { WebhookEvent } from '@clerk/backend';
import type { OrganizationJSON, OrganizationMembershipJSON, UserJSON } from '@clerk/backend';
import type { Role } from '../shared';
import { ROLES } from '../shared';
import { userRepository } from '../repositories/user.repository';
import { memberRepository } from '../repositories/member.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { nameFromEmail } from './auth.service';
import { logger } from '../utils/logger';

/** Clerk org roles look like `org:admin` — map to our internal Role enum. */
function mapClerkRole(clerkRole: string): Role {
  const bare = clerkRole.replace(/^org:/, '');
  if ((ROLES as readonly string[]).includes(bare)) return bare as Role;
  // Clerk's built-in default non-admin role is `org:member` — no direct
  // equivalent in our RBAC, so map it to the closest working role.
  if (bare === 'member') return 'recruiter';
  return 'viewer';
}

function primaryEmail(data: UserJSON): string | undefined {
  return (
    data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address ??
    data.email_addresses[0]?.email_address
  );
}

function fullName(first: string | null, last: string | null): string | undefined {
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || undefined;
}

export const clerkSyncService = {
  /** Routes a verified Clerk webhook event to the right sync handler. */
  async handle(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await this.syncUser(event.data);
        return;
      case 'organization.created':
        await this.syncOrganizationCreated(event.data as OrganizationJSON);
        return;
      case 'organizationMembership.created':
        await this.syncMembershipCreated(event.data);
        return;
      case 'organizationMembership.updated':
        await this.syncMembershipUpdated(event.data);
        return;
      case 'organizationMembership.deleted':
        await this.syncMembershipDeleted(event.data);
        return;
      default:
        // Other event types (organization.*, session.*, etc.) are not synced yet.
        return;
    }
  },

  /** `organization.created` — associate the Clerk org with an existing workspace by slug, or log if none found. */
  async syncOrganizationCreated(data: OrganizationJSON): Promise<void> {
    const existing = await workspaceRepository.findByClerkOrgId(data.id);
    if (existing) return; // already associated

    // Atomically claim the workspace by slug — findOneAndUpdate with
    // { slug, clerkOrgId: null } prevents two concurrent events from
    // both reading the same unclaimed workspace and overwriting each other.
    const claimed = await workspaceRepository.claimBySlug(data.slug, data.id);
    if (claimed) {
      logger.info({ clerkOrgId: data.id, workspaceId: String(claimed._id) }, 'backfilled clerkOrgId on workspace via organization.created');
      return;
    }
    logger.warn({ clerkOrgId: data.id, slug: data.slug }, 'organization.created: no matching workspace found by slug (or already claimed)');
  },

  /** `user.created` / `user.updated` — upsert the Mongo User by clerkId. */
  async syncUser(data: UserJSON): Promise<void> {
    const email = primaryEmail(data);
    if (!email) {
      logger.warn({ clerkId: data.id }, 'clerk user webhook missing an email address; skipping');
      return;
    }
    const name = fullName(data.first_name, data.last_name);

    let user = await userRepository.findByClerkId(data.id);
    if (!user) user = await userRepository.findByEmail(email);

    if (!user) {
      await userRepository.create({
        email,
        name: name ?? nameFromEmail(email),
        clerkId: data.id,
      });
      return;
    }

    let changed = false;
    if (user.clerkId !== data.id) {
      user.clerkId = data.id;
      changed = true;
    }
    if (user.email !== email) {
      user.email = email;
      changed = true;
    }
    if (name && user.name !== name) {
      user.name = name;
      changed = true;
    }
    if (changed) await user.save();
  },

  /** `organizationMembership.created` — create the local WorkspaceMember row. */
  async syncMembershipCreated(data: OrganizationMembershipJSON): Promise<void> {
    let workspace = await workspaceRepository.findByClerkOrgId(data.organization.id);
    if (!workspace) {
      // Try to atomically claim by slug for workspaces created before Clerk integration.
      workspace = await workspaceRepository.claimBySlug(data.organization.slug, data.organization.id);
      if (workspace) {
        logger.info({ clerkOrgId: data.organization.id, workspaceId: String(workspace._id) }, 'backfilled clerkOrgId on workspace via membership webhook');
      } else {
        logger.warn({ clerkOrgId: data.organization.id }, 'clerk org membership webhook: no matching workspace');
        return;
      }
    }

    const user = await this.ensureLocalUserForMembership(data);
    const role = mapClerkRole(data.role);

    const existingByMembershipId = await memberRepository.findByClerkMembershipId(data.id);
    if (existingByMembershipId) {
      await memberRepository.updateRole(String(existingByMembershipId._id), role);
      return;
    }

    const existingPair = await memberRepository.find(String(workspace._id), String(user._id));
    if (existingPair) {
      existingPair.role = role;
      existingPair.clerkMembershipId = data.id;
      await existingPair.save();
      return;
    }

    await memberRepository.create({
      workspaceId: workspace._id,
      userId: user._id,
      role,
      clerkMembershipId: data.id,
    });
  },

  /** `organizationMembership.updated` — update the role on the local WorkspaceMember. */
  async syncMembershipUpdated(data: OrganizationMembershipJSON): Promise<void> {
    const role = mapClerkRole(data.role);

    const existing = await memberRepository.findByClerkMembershipId(data.id);
    if (existing) {
      await memberRepository.updateRole(String(existing._id), role);
      return;
    }

    // Fallback for memberships that predate the clerkMembershipId backfill.
    const workspace = await workspaceRepository.findByClerkOrgId(data.organization.id);
    const user = await userRepository.findByClerkId(data.public_user_data.user_id);
    if (!workspace || !user) return;
    const pair = await memberRepository.find(String(workspace._id), String(user._id));
    if (pair) {
      pair.role = role;
      pair.clerkMembershipId = data.id;
      await pair.save();
    }
  },

  /** `organizationMembership.deleted` — remove the local WorkspaceMember row. */
  async syncMembershipDeleted(data: OrganizationMembershipJSON): Promise<void> {
    const existing = await memberRepository.findByClerkMembershipId(data.id);
    if (existing) {
      await memberRepository.remove(String(existing._id));
      return;
    }

    const workspace = await workspaceRepository.findByClerkOrgId(data.organization.id);
    const user = await userRepository.findByClerkId(data.public_user_data.user_id);
    if (!workspace || !user) return;
    const pair = await memberRepository.find(String(workspace._id), String(user._id));
    if (pair) await memberRepository.remove(String(pair._id));
  },

  /** Finds (or JIT-provisions) the local User referenced by an org membership event. */
  async ensureLocalUserForMembership(data: OrganizationMembershipJSON) {
    const clerkUserId = data.public_user_data.user_id;
    let user = await userRepository.findByClerkId(clerkUserId);
    if (user) return user;

    const email = data.public_user_data.identifier;
    user = await userRepository.findByEmail(email);
    if (user) {
      if (!user.clerkId) {
        user.clerkId = clerkUserId;
        await user.save();
      }
      return user;
    }

    const name = fullName(data.public_user_data.first_name, data.public_user_data.last_name);
    return userRepository.create({
      email,
      name: name ?? nameFromEmail(email),
      clerkId: clerkUserId,
    });
  },
};
