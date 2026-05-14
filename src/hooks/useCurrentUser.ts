'use client';

import useSWR from 'swr';
import { UserSession } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }
  return res.json();
});

export const useCurrentUser = () => {
  const { data, error, isLoading, mutate } = useSWR<UserSession>('/api/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    user: data,
    isLoading,
    isError: error,
    mutate,
  };
};
