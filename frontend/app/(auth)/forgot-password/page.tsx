'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@fluxberry/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { requestPasswordReset } from '@/lib/auth-actions';
import { hasSupabase } from '@/lib/config';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      {sent ? (
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a reset link.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasSupabase
              ? "Enter your email and we'll send a reset link."
              : 'Password reset is available once Supabase auth is configured.'}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
            </Field>
            <Button type="submit" className="w-full" loading={submitting} disabled={!hasSupabase}>
              Send reset link
            </Button>
          </form>
        </>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          Back to log in
        </Link>
      </p>
    </Card>
  );
}
