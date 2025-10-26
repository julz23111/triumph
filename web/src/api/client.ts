const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, params?: ApiOptions['params']) {
  const url = new URL(path, API_BASE_URL || window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = buildUrl(path, options.params);
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
    body: options.body ?? (options.method && options.method !== 'GET' ? options.body : undefined)
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.error || JSON.stringify(data);
    } catch (error) {
      console.warn('Failed to parse error response', error);
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  const text = await response.text();
  return text as unknown as T;
}

export async function apiUpload<T>(path: string, form: FormData, options: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    credentials: 'include',
    method: 'POST',
    body: form,
    ...options
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.error || JSON.stringify(data);
    } catch (error) {
      console.warn('Failed to parse error response', error);
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
