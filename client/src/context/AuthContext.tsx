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
    // TODO(you): POST to /api/auth/login with { email, password } as a JSON
    // body -- don't forget the "Content-Type: application/json" header, or
    // Express's express.json() middleware won't parse req.body at all.
    //
    // If the response is not ok (check response.ok), parse the JSON error
    // body and `throw new Error(data.error)` -- this lets whatever calls
    // login() catch it and show the message to the user.
    //
    // If it succeeded, parse the JSON body and call setAccessToken with the
    // accessToken it contains.
  }

  async function signup(email: string, password: string): Promise<void> {
    // TODO(you): same shape as login, but POST to /api/auth/signup.
    //
    // Note: SignupForm also collects a `username`, but our backend has no
    // username column at all (check the Lesson 1 migration) -- don't send
    // it. That's a known gap outside this course's scope, not something to
    // solve here.
    //
    // One more difference from login: your signup endpoint responds 201
    // with the created user's id/email, but does NOT issue tokens -- it
    // never logs the user in automatically. That matches how most real
    // signup flows work: create the account, then require an explicit
    // login. So this function doesn't touch accessToken at all -- just
    // handle the error case the same way login does, and let it resolve
    // (return) on success.
  }

  return (
    <AuthContext.Provider value={{ accessToken, login, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
