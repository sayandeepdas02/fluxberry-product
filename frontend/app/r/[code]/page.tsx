import { notFound, redirect } from 'next/navigation';
import { fetchReferralTarget } from '@/lib/public-api';

type Params = Promise<{ code: string }>;

/** Referral share links point here — resolve, then hand off to the normal apply page. */
export default async function ReferralRedirectPage({ params }: { params: Params }) {
  const { code } = await params;
  const target = await fetchReferralTarget(code);
  if (!target) notFound();
  redirect(`/apply/${target.workspaceSlug}/${target.jobSlug}?source=REFERRAL&ref=${encodeURIComponent(code)}`);
}
