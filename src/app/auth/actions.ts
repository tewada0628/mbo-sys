'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

import prisma from '@/lib/db';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();

  // Check if email exists in our employees table
  const employee = await prisma.employee.findUnique({
    where: { email },
  });

  if (!employee) {
    return { error: '登録されていないメールアドレスです。' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/login/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;
  const supabase = await createClient();

  // まず email (OTP) として検証を試みる
  let result = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  // 失敗した場合は signup として再試行（新規登録時の場合）
  if (result.error) {
    result = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
  }

  if (result.error) {
    return { error: result.error.message };
  }

  redirect('/');
}

export async function resendOtp(email: string) {
  const supabase = await createClient();

  // Check if email exists in our employees table
  const employee = await prisma.employee.findUnique({
    where: { email },
  });

  if (!employee) {
    return { error: '登録されていないメールアドレスです。' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) {
    // Supabaseのレート制限エラー（30秒待機）を日本語化
    if (error.message.includes('For security purposes, you can only request this after 30 seconds')) {
      return { error: 'セキュリティのため、再送は30秒経過してから再度お試しください。' };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
