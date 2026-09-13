import type { CreateLabelInput, UpdateLabelInput, LabelDto } from '@fluxberry/shared';
import { labelRepository } from '../repositories/label.repository';
import { applicationRepository } from '../repositories/application.repository';
import { ApplicationModel } from '../models/application.model';
import { toLabelDto } from '../serializers/label.serializer';
import { notFound, conflict, badRequest } from '../utils/errors';
import { auditService } from './audit.service';

const MAX_LABELS_PER_WORKSPACE = 100;

export const labelService = {
  async list(workspaceId: string): Promise<LabelDto[]> {
    const labels = await labelRepository.list(workspaceId);
    return labels.map(toLabelDto);
  },

  async create(workspaceId: string, userId: string, input: CreateLabelInput): Promise<LabelDto> {
    const count = await labelRepository.countByWorkspace(workspaceId);
    if (count >= MAX_LABELS_PER_WORKSPACE) {
      throw badRequest(`A workspace can have at most ${MAX_LABELS_PER_WORKSPACE} labels`);
    }
    if (await labelRepository.existsByName(workspaceId, input.name)) {
      throw conflict(`A label named "${input.name}" already exists`);
    }
    const label = await labelRepository.create({
      workspaceId: workspaceId as any,
      name: input.name,
      color: input.color,
    });
    await auditService.log({
      workspaceId,
      userId,
      action: 'label.created',
      resourceType: 'label',
      resourceId: String(label._id),
      metadata: { name: label.name },
    });
    return toLabelDto(label);
  },

  async update(workspaceId: string, userId: string, labelId: string, input: UpdateLabelInput): Promise<LabelDto> {
    const existing = await labelRepository.findInWorkspace(workspaceId, labelId);
    if (!existing) throw notFound('Label not found');
    if (input.name && (await labelRepository.existsByName(workspaceId, input.name, labelId))) {
      throw conflict(`A label named "${input.name}" already exists`);
    }
    const updated = await labelRepository.update(labelId, input);
    await auditService.log({
      workspaceId,
      userId,
      action: 'label.updated',
      resourceType: 'label',
      resourceId: labelId,
      metadata: input,
    });
    return toLabelDto(updated!);
  },

  async remove(workspaceId: string, userId: string, labelId: string): Promise<void> {
    const existing = await labelRepository.findInWorkspace(workspaceId, labelId);
    if (!existing) throw notFound('Label not found');
    // Cascade: strip this label from every application that has it, then delete it.
    await ApplicationModel.updateMany({ workspaceId, labelIds: labelId }, { $pull: { labelIds: labelId } });
    await labelRepository.remove(labelId);
    await auditService.log({
      workspaceId,
      userId,
      action: 'label.deleted',
      resourceType: 'label',
      resourceId: labelId,
      metadata: { name: existing.name },
    });
  },

  /** Full-replace: the set of labels shown as "selected" in the tag picker becomes exactly this list. */
  async setApplicationLabels(workspaceId: string, applicationId: string, labelIds: string[]): Promise<LabelDto[]> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');

    const unique = Array.from(new Set(labelIds));
    const labels = unique.length ? await labelRepository.findByIds(unique) : [];
    const foundIds = new Set(labels.map((l) => String(l._id)));
    const missing = unique.filter((id) => !foundIds.has(id));
    if (missing.length) throw badRequest(`Unknown label id(s): ${missing.join(', ')}`);
    // Belt-and-suspenders: every found label must actually belong to this workspace.
    const foreign = labels.filter((l) => String(l.workspaceId) !== workspaceId);
    if (foreign.length) throw badRequest('One or more labels do not belong to this workspace');

    await applicationRepository.update(applicationId, { labelIds: unique });
    return labels.sort((a, b) => a.name.localeCompare(b.name)).map(toLabelDto);
  },
};
