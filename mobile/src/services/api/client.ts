export type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  token?: string | null;
};

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export class ApiConnectionError extends Error {
  constructor() {
    super('No se pudo conectar con la API. Verifica la conexión y la URL base.');
    this.name = 'ApiConnectionError';
  }
}

export class ApiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export class ApiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

function getApiBaseUrl(): URL {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    throw new ApiConfigurationError(
      'Falta configurar EXPO_PUBLIC_API_URL para conectar con la API.',
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    throw new ApiConfigurationError(
      'EXPO_PUBLIC_API_URL debe ser una URL HTTP o HTTPS válida.',
    );
  }

  if (
    (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new ApiConfigurationError(
      'EXPO_PUBLIC_API_URL debe usar HTTP o HTTPS y no incluir credenciales.',
    );
  }

  if (!baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname += '/';
  }

  return baseUrl;
}

function getRequestUrl(endpoint: string): URL {
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
    throw new ApiConfigurationError(
      'La ruta de la API debe ser relativa y comenzar con una sola barra.',
    );
  }

  return new URL(endpoint.slice(1), getApiBaseUrl());
}

function getErrorMessage(body: unknown, status: number, statusText: string): string {
  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.map(String).join('; ');
    }
  }

  return `La solicitud falló: ${status} ${statusText}`.trim();
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const url = getRequestUrl(endpoint);
  const { token, headers: requestHeaders, ...requestOptions } = options;
  const headers = new Headers(requestHeaders);

  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  if (token?.trim()) {
    headers.set('Authorization', `Bearer ${token.trim()}`);
  } else {
    headers.delete('Authorization');
  }

  let response: Response;
  let responseText: string;
  try {
    response = await fetch(url.toString(), {
      ...requestOptions,
      headers,
    });
    responseText = await response.text();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      throw error;
    }
    throw new ApiConnectionError();
  }

  let responseBody: unknown;

  if (responseText.trim()) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new ApiResponseError('La API devolvió una respuesta que no es JSON.');
      }
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    throw new ApiHttpError(
      getErrorMessage(responseBody, response.status, response.statusText),
      response.status,
      responseBody,
    );
  }

  return responseBody as T;
}
