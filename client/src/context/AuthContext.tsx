import { createContext } from 'react';

export interface AuthContextValue {
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<string>;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  logoutAll: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
