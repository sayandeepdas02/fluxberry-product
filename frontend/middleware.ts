import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// clerkMiddleware() throws on every request when no publishable/secret key is
// configured, so keep it opt-in during the migration (AUTH_PROVIDER=supabase
// deployments ship with these blank and must keep working unmodified).
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default clerkConfigured ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
