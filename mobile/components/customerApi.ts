export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export async function customerRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'The request could not be completed.');
  }
  return result as T;
}