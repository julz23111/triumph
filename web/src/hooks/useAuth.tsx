import { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.ts';
import { AuthResponse, User } from '../api/types.ts';
import { z } from 'zod';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await apiFetch<AuthResponse>('/auth/me');
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('unauthorized')) {
          return { user: null } as AuthResponse | { user: null };
        }
        throw error;
      }
    },
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: async (variables: { email: string; password: string }) => {
      const payload = loginSchema.parse(variables);
      const response = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return response;
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], response);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiFetch('/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], { user: null });
    }
  });

  const value = useMemo(
    () => ({
      user: data?.user ?? null,
      loading: isLoading,
      login: async (variables: { email: string; password: string }) => {
        await loginMutation.mutateAsync(variables);
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      }
    }),
    [data?.user, isLoading, loginMutation, logoutMutation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
