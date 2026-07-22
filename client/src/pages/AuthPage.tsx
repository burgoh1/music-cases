import { useState } from 'react';
import { Logo } from '../components/Logo';
import { AuthTabs, type AuthMode } from '../components/AuthTabs';
import { LoginForm, type LoginPayload } from '../components/LoginForm';
import { SignupForm, type SignupPayload } from '../components/SignupForm';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  function handleLogin(payload: LoginPayload) {
    console.log('login', payload);
  }

  function handleSignup(payload: SignupPayload) {
    console.log('signup', payload);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.35fr_0.65fr]">
      {/* LEFT: hero */}
      <div className="relative hidden overflow-hidden border-r border-ink-600 lg:block">
        <div className="absolute bottom-13 left-14 z-50 leading-[1.05]">
          <span className="block text-[2.2rem] font-extrabold tracking-tight text-ink-50">
            Your music.
          </span>
          <span className="block text-[2.2rem] font-extrabold tracking-tight text-brand-500">
            Your collection.
          </span>
        </div>
      </div>

      {/* RIGHT: auth panel */}
      <div className="flex items-center justify-center bg-ink-900 px-10 py-12 lg:px-16">
        <div className="w-full max-w-xl">
          <Logo />
          <AuthTabs mode={mode} onChange={setMode} />
          {mode === 'login' ? (
            <LoginForm onSubmit={handleLogin} />
          ) : (
            <SignupForm onSubmit={handleSignup} />
          )}
        </div>
      </div>
    </div>
  );
}
