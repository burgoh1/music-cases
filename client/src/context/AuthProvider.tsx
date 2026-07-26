import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './AuthContext.js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO(you): run the initial "am I already logged in" check exactly
  // once, when AuthProvider first mounts -- that's what useEffect with an
  // empty dependency array ([]) is for: `useEffect(() => { ... }, [])`.
  //
  // Inside it: call refresh(). If it succeeds, refresh() already calls
  // setAccessToken for you -- nothing more to do. If it throws (no valid
  // refresh cookie -- a normal, expected outcome for a logged-out visitor,
  // not a bug), just swallow it with a .catch(() => {}) -- there's nothing
  // to do or log, the user simply isn't logged in.
  //
  // Either way, once that attempt resolves (succeeded OR failed), call
  // setIsLoading(false) -- a .finally(...) on the promise chain is the
  // cleanest way to guarantee that runs in both cases.

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
        isLoading,
        login,
        signup,
        refresh,
        authFetch,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
