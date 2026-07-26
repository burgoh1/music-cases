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
    // send a post request to login endpoint
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    // if it dosent work, throw error message
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    } else {
      // if it does work, set access token state with returned access token
      setAccessToken(data.accessToken);
      return;
    }
  }

  async function signup(email: string, password: string): Promise<void> {
    // send a post request to signup endpoint
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    // if it dosent work, throw error message
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    } else {
      // if it does work, simply return
      return;
    }
  }

  async function refresh(): Promise<string> {
    // make a POST request to refresh endpoint to get new access toket
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    const data = await res.json();
    // throw if error
    if (!res.ok) {
      setAccessToken(null);
      throw new Error(data.error);
    }

    // set access token to new access token
    setAccessToken(data.accessToken);
    return data.accessToken;
  }

  async function authFetch(
    input: RequestInfo, // URL string
    init: RequestInit = {} // options obj (method, headers, body)
  ): Promise<Response> {
    const requestWithToken = (token: string | null) => {
      // create new header and merge any existing headers
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // returns response with headers
      return fetch(input, { ...init, headers });
    };

    // first attempt, check if access token is still valid
    const response = await requestWithToken(accessToken);
    if (response.status !== 401) {
      return response;
    }

    // if access token is expired/invalid, return fetch with new access token
    return requestWithToken(await refresh());
  }

  return (
    <AuthContext.Provider
      value={{ accessToken, login, signup, refresh, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}
