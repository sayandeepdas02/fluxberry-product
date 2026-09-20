import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { OfferResponse } from '@/components/offers/offer-response';

export const metadata: Metadata = noIndexMetadata;

export default function OfferResponsePage() {
  return <OfferResponse />;
}
