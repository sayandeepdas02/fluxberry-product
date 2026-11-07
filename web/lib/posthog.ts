import { publicConfig } from './config';

let posthogInstance: any = null;
let initialized = false;

async function getPostHog() {
  if (!publicConfig.posthogKey) return null;
  if (posthogInstance) return posthogInstance;
  if (initialized) return null;
  initialized = true;
  try {
    const mod = await import('posthog-js');
    posthogInstance = mod.default;
    posthogInstance.init(publicConfig.posthogKey, {
      api_host: publicConfig.posthogHost || 'https://us.i.posthog.com',
      capture_pageview: false,
    });
    return posthogInstance;
  } catch {
    return null;
  }
}

export async function trackEvent(name: string, properties?: Record<string, unknown>) {
  const ph = await getPostHog();
  ph?.capture(name, properties);
}
