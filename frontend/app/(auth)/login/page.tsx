'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AuthHeading, authButtonClass, authInputClass } from '@/components/marketing/auth-shell';
import { toast } from '@/components/ui/sonner';
import { signIn } from '@/lib/auth-actions';
import { hasSupabase } from '@/lib/config';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: hasSupabase ? z.string().min(1, 'Password is required') : z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signIn({ email: values.email, password: values.password ?? '' });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      router.replace('/app');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign in');
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Log in to continue hiring." />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={authInputClass}
            {...register('email')}
          />
        </Field>
        {hasSupabase && (
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className={authInputClass}
              {...register('password')}
            />
          </Field>
        )}
        <Button type="submit" className={authButtonClass} loading={submitting}>
          Log in
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-ink-200 pt-4 text-[13px]">
        <Link href="/forgot-password" className="text-ink-500 transition-colors hover:text-ink">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium text-berry-700 hover:underline">
          Create account
        </Link>
      </div>
    </>
  );
}
