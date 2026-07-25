import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextValue {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
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

  return (
    <AuthContext.Provider value={{ accessToken, login, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
