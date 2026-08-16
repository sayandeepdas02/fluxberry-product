import Link from 'next/link';
import { publicConfig } from '@/lib/config';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-6 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        {publicConfig.appName}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
