import { useState, type ReactNode } from 'react';
import { AuthContext } from './AuthContext.js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    } else {
      setAccessToken(data.accessToken);
      return;
    }
  }

  async function signup(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    } else {
      return;
    }
  }

  async function refresh(): Promise<string> {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      setAccessToken(null);
      throw new Error(data.error);
    }

    setAccessToken(data.accessToken);
    return data.accessToken;
  }

  async function authFetch(
    input: RequestInfo,
    init: RequestInit = {}
  ): Promise<Response> {
    const requestWithToken = (token: string | null) => {
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    };

    const response = await requestWithToken(accessToken);
    if (response.status !== 401) {
      return response;
    }

    return requestWithToken(await refresh());
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
    }
  }

  async function logoutAll(): Promise<void> {
    try {
      await authFetch('/api/auth/logout-all', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        login,
        signup,
        refresh,
        authFetch,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
