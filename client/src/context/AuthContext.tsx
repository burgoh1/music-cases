import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextValue {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<string>;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
    // TODO(you): make the request with the CURRENT accessToken attached as
    // an "Authorization: Bearer <token>" header -- merge it into any
    // headers already present on `init`, don't just overwrite them.
    //
    // If the response comes back 401 (access token expired/invalid), call
    // refresh() to get a new access token, then retry the SAME request
    // once more with the new token attached, and return THAT response.
    // If refresh() itself throws (refresh token also expired/invalid --
    // the user needs to log in again for real), let that error propagate
    // up to the caller; don't catch it here.
    //
    // If the first response was not 401, just return it as-is.
  }

  return (
    <AuthContext.Provider
      value={{ accessToken, login, signup, refresh, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}
