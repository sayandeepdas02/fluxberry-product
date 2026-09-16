'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@fluxberry/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AuthHeading, authButtonClass, authInputClass } from '@/components/marketing/auth-shell';
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
    <>
      <AuthHeading
        title="Reset your password"
        subtitle={
          sent
            ? "If an account exists for that email, we've sent a reset link."
            : hasSupabase
              ? "Enter your email and we'll send a reset link."
              : 'Password reset is available once Supabase auth is configured.'
        }
      />

      {!sent && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className={authInputClass}
              {...register('email')}
            />
          </Field>
          <Button type="submit" className={authButtonClass} loading={submitting} disabled={!hasSupabase}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 border-t border-ink-200 pt-4 text-center text-[13px]">
        <Link href="/login" className="text-ink-500 transition-colors hover:text-ink">
          Back to log in
        </Link>
      </p>
    </>
  );
}
