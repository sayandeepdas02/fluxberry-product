import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { fetchReferralTarget } from '@/lib/public-api';
import { noIndexMetadata } from '@/lib/seo';

type Params = Promise<{ code: string }>;

export const metadata: Metadata = noIndexMetadata;

/** Referral share links point here — resolve, then hand off to the normal apply page. */
export default async function ReferralRedirectPage({ params }: { params: Params }) {
  const { code } = await params;
  const target = await fetchReferralTarget(code);
  if (!target) notFound();
  redirect(`/apply/${target.workspaceSlug}/${target.jobSlug}?source=REFERRAL&ref=${encodeURIComponent(code)}`);
}
