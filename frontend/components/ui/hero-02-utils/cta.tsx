import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface CtaProps {
  ctaEnabled: boolean;
  text: string;
  link: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function Cta({ cta }: { cta: CtaProps }) {
  if (!cta.ctaEnabled) return null;

  return (
    <Button variant={cta.variant} size={cta.size} className="rounded-full px-8" asChild>
      <Link href={cta.link || '/sign-up'}>{cta.text}</Link>
    </Button>
  );
}
