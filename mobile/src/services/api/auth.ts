import { apiRequest, ApiResponseError } from '@/services/api/client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisteredUser {
  user_id: number;
  name: string;
  email: string;
  created_at: string;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export async function registerUser(
  user: RegisterUserRequest,
): Promise<RegisteredUser> {
  return apiRequest<RegisteredUser>('/users/register', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function loginUser(
  credentials: Pick<RegisterUserRequest, 'email' | 'password'>,
): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  if (
    typeof response?.access_token !== 'string' ||
    !response.access_token.trim() ||
    typeof response.user?.id !== 'number' ||
    typeof response.user.name !== 'string' ||
    typeof response.user.email !== 'string'
  ) {
    throw new ApiResponseError('La respuesta de inicio de sesión no tiene el formato esperado.');
  }

  return {
    accessToken: response.access_token,
    user: response.user,
  };
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
}
