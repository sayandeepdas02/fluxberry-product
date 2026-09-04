import { PostHog } from 'posthog-node';
import { config } from '../config/env';

const client: PostHog | null =
  config.observability?.posthogKey
    ? new PostHog(config.observability.posthogKey, { host: config.observability.posthogHost })
    : null;

export function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  client?.capture({ distinctId, event, properties });
}
