import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { emitUnauthorized } from './authEvents';
import { endpoints } from './endpoints';
import { recordServerDate } from '../lib/deviceTimeSync';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  return fromEnv ?? fromExtra ?? 'http://10.0.2.2:5000';
}

export const apiBaseUrl = resolveApiUrl();

export const client = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  timeout: 30_000,
});

/** Kept in sync by AuthProvider - avoids an async SecureStore read on every single request. */
let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

/** For the rare case a component needs to attach the token itself - e.g. RN's core Image
 * component, which does not run through the axios interceptor. */
export function getAccessToken(): string | null {
  return currentAccessToken;
}

client.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    recordServerDate(response.headers?.date);
    return response;
  },
  (error: AxiosError) => {
    const isLoginCall = error.config?.url === endpoints.auth.login;
    if (error.response?.status === 401 && !isLoginCall) {
      emitUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  },
);

function normalizeError(error: AxiosError): ApiError {
  const data = error.response?.data as { code?: string; title?: string; errors?: Record<string, string[]> } | undefined;
  // The API's Title already contains the specific reason for validation failures (e.g. "Password
  // must be at least 8 characters long."), but fall back to stitching the field errors together
  // ourselves in case a future endpoint sends errors without a descriptive title.
  const fieldErrorText = data?.errors
    ? Object.values(data.errors).flat().join(' ')
    : undefined;
  return {
    status: error.response?.status ?? 0,
    code: data?.code ?? 'NETWORK_ERROR',
    message: data?.title || fieldErrorText || error.message || 'Something went wrong. Please try again.',
    fieldErrors: data?.errors,
  };
}

export function resolveUploadUrl(relativePath: string): string {
  return `${apiBaseUrl}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}