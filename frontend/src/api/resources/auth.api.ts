import { client } from '../client';
import { endpoints } from '../endpoints';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAtUtc: string;
  mustResetPassword: boolean;
  role: 'Admin' | 'Mentor' | 'Intern';
  fullName: string;
  userId: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface MeResponse {
  userId: number;
  role: 'Admin' | 'Mentor' | 'Intern';
  fullName: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  profileImageUrl: string | null;
  departmentId: number | null;
  departmentName: string | null;
  internProfileId: number | null;
  mustResetPassword: boolean;
}

export const authApi = {
  login: (body: LoginRequest) => client.post<LoginResponse>(endpoints.auth.login, body).then((r) => r.data),

  refresh: (refreshToken: string) =>
    client.post<LoginResponse>(endpoints.auth.refresh, { refreshToken }).then((r) => r.data),

  changePassword: (body: ChangePasswordRequest) =>
    client.post<LoginResponse>(endpoints.auth.changePassword, body).then((r) => r.data),

  me: () => client.get<MeResponse>(endpoints.auth.me).then((r) => r.data),

  forgotPassword: (body: ForgotPasswordRequest) =>
    client.post<{ message: string }>(endpoints.auth.forgotPassword, body).then((r) => r.data),

  logout: (refreshToken: string) => client.post(endpoints.auth.logout, { refreshToken }),

  logoutAll: () => client.post(endpoints.auth.logoutAll),
};
