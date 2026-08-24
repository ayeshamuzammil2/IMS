import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { setAccessToken } from '../api/client';
import { onUnauthorized } from '../api/authEvents';
import { authApi, type LoginResponse, type MeResponse } from '../api/resources/auth.api';
import { registerForPushNotifications } from '../lib/pushNotifications';

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'mustReset' | 'signedIn';

export interface AuthUser {
  userId: number;
  role: 'Admin' | 'Mentor' | 'Intern';
  fullName: string;
  email: string;
  mustResetPassword: boolean;
  departmentId?: number | null;
  internProfileId?: number | null;
  profileImageUrl?: string | null;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const ACCESS_TOKEN_KEY = 'pia.accessToken';
const REFRESH_TOKEN_KEY = 'pia.refreshToken';
const SESSION_KEY = 'pia.session';

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(me: MeResponse): AuthUser {
  return {
    userId: me.userId,
    role: me.role,
    fullName: me.fullName,
    email: me.email,
    mustResetPassword: me.mustResetPassword,
    departmentId: me.departmentId,
    internProfileId: me.internProfileId,
    profileImageUrl: me.profileImageUrl,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();
  const signingOutRef = useRef(false);

  const clearSession = useCallback(async () => {
    setAccessToken(null);
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(SESSION_KEY),
    ]);
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
  }, [queryClient]);

  const applyLoginResponse = useCallback(async (response: LoginResponse) => {
    setAccessToken(response.accessToken);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken);
    if (response.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refreshToken);
    }

    if (response.mustResetPassword) {
      const partialUser: AuthUser = {
        userId: response.userId,
        role: response.role,
        fullName: response.fullName,
        email: '',
        mustResetPassword: true,
      };
      setUser(partialUser);
      setStatus('mustReset');
      return;
    }

    const me = await authApi.me();
    const fullUser = toAuthUser(me);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(fullUser));
    setUser(fullUser);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    if (status === 'signedIn') {
      registerForPushNotifications();
    }
  }, [status]);

  useEffect(() => {
    onUnauthorized(() => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      clearSession().finally(() => {
        signingOutRef.current = false;
      });
      Toast.show({ type: 'error', text1: 'Your session expired', text2: 'Please sign in again.' });
    });
  }, [clearSession]);

  useEffect(() => {
    (async () => {
      const [accessToken, sessionJson] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(SESSION_KEY),
      ]);

      if (!accessToken) {
        setStatus('signedOut');
        return;
      }

      setAccessToken(accessToken);

      // Persisted session survives an app restart mid-forced-reset - the exact case where v1
      // dropped the user straight into the app with a temp password because it only tracked
      // mustResetPassword in memory.
      const persisted = sessionJson ? (JSON.parse(sessionJson) as AuthUser) : null;
      if (persisted?.mustResetPassword) {
        setUser(persisted);
        setStatus('mustReset');
        return;
      }

      try {
        const me = await authApi.me();
        const fullUser = toAuthUser(me);
        if (fullUser.mustResetPassword) {
          setUser(fullUser);
          setStatus('mustReset');
        } else {
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(fullUser));
          setUser(fullUser);
          setStatus('signedIn');
        }
      } catch {
        await clearSession();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      await applyLoginResponse(response);
    },
    [applyLoginResponse],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      await applyLoginResponse(response);
    },
    [applyLoginResponse],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {});
    }
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    const fullUser = toAuthUser(me);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(fullUser));
    setUser(fullUser);
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, signIn, signOut, refreshUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
