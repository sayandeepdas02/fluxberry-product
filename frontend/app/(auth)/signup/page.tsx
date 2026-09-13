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
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { signUp } from '@/lib/auth-actions';
import { hasSupabase } from '@/lib/config';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: hasSupabase ? z.string().min(8, 'Use at least 8 characters') : z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
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
      const { needsEmailConfirm } = await signUp({
        name: values.name,
        email: values.email,
        password: values.password ?? '',
      });
      if (needsEmailConfirm) {
        toast.success('Check your email to confirm your account.');
        setSubmitting(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      router.replace('/onboarding');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign up');
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h1 className="text-card-title">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start hiring in minutes.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" placeholder="Jane Doe" {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} />
        </Field>
        {hasSupabase && (
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          </Field>
        )}
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
