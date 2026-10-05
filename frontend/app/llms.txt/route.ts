import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { PLAN_PRICING } from '@/lib/pricing';
import { CONTACT_EMAIL } from '@/components/marketing/landing/content';

/** Built once at build time (not per request), so the blog's markdown is read here and never at runtime. */
export const dynamic = 'force-static';

/** /llms.txt: a plain-text map of the site for AI assistants, in the llmstxt.org format. */
export function GET() {
  const site = publicConfig.appUrl;
  const posts = getAllPosts();
  const body = `# Fluxberry

> Fluxberry is an AI native hiring platform, and the simplest ATS for lean teams and founders hiring their early teams. It scores every applicant against your job, runs your pipeline and careers page, and helps you source candidates.

Plans: Pro at $${PLAN_PRICING.PRO.monthly}/month and Max at $${PLAN_PRICING.MAX.monthly}/month, with unlimited jobs, candidates and team members. Built by Sayandeep Das, an indie hacker. Contact: ${CONTACT_EMAIL}

## Product

- [Home](${site}/): what Fluxberry does
- [Pricing](${site}/pricing): Pro and Max plans, billing and FAQ
- [About](${site}/about): who builds Fluxberry and what it does, feature by feature

## Blog

${posts.map((post) => `- [${post.title}](${site}/blog/${post.slug}): ${post.description}`).join('\n')}

## Legal

- [Privacy Policy](${site}/privacy)
- [Terms of Service](${site}/terms)
- [Refund Policy](${site}/refund-policy)
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
