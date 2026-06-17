import { API_URL } from "@/config/env";
import { clearAuthToken, getAuthToken } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Only invalidate the session when the request was authenticated.
    if (getAuthToken()) {
      clearAuthToken();
      onUnauthorized?.();
    }
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new ApiError(
      detail || `Request failed (${res.status})`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

export async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: authHeaders(),
    });
  } catch {
    throw new ApiError(
      `Network error reaching ${API_URL}. Is the backend running?`,
      0,
    );
  }
  return handleResponse<T>(res);
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      `Network error reaching ${API_URL}. Is the backend running?`,
      0,
    );
  }
  return handleResponse<T>(res);
}

export async function del(path: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch {
    throw new ApiError(
      `Network error reaching ${API_URL}. Is the backend running?`,
      0,
    );
  }
  if (res.status === 401) {
    if (getAuthToken()) {
      clearAuthToken();
      onUnauthorized?.();
    }
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      `Network error reaching ${API_URL}. Is the backend running?`,
      0,
    );
  }
  return handleResponse<T>(res);
}
