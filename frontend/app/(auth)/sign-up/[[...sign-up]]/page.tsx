import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = { title: 'Sign up', ...noIndexMetadata };

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp />
    </div>
  );
}
