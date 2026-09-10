import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hasPermission, type User, type UserRole } from '@trackcontrol/shared';
import { api, getStoredUserId, setStoredUserId } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

interface CurrentUserContextValue {
  user: User | null;
  users: User[];
  loading: boolean;
  can: (permission: string) => boolean;
  switchUser: (id: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

/**
 * Sesión simulada. El usuario activo se envía al API en el header `x-user-id`.
 * Cuando exista autenticación real, este provider pasará a leer el token/sesión.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => getStoredUserId());

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data, staleTime: 5 * 60_000 });
  const meQuery = useQuery({
    queryKey: ['auth', 'me', userId],
    queryFn: async () => (await api.get<{ user: User; permissions: string[] }>('/auth/me')).data,
  });

  useEffect(() => {
    if (meQuery.data && meQuery.data.user.id !== userId) {
      setUserId(meQuery.data.user.id);
      setStoredUserId(meQuery.data.user.id);
    }
  }, [meQuery.data, userId]);

  const switchUser = useCallback((id: string) => {
    setStoredUserId(id);
    setUserId(id);
    queryClient.invalidateQueries();
  }, []);

  const value = useMemo<CurrentUserContextValue>(() => {
    const user = meQuery.data?.user ?? null;
    return {
      user,
      users: usersQuery.data ?? [],
      loading: meQuery.isLoading,
      can: (permission) => (user ? hasPermission(user.role as UserRole, permission) : false),
      switchUser,
    };
  }, [meQuery.data, meQuery.isLoading, usersQuery.data, switchUser]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser debe usarse dentro de CurrentUserProvider');
  return ctx;
}
