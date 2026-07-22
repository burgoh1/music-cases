import { ChevronRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { TextField } from './TextField';
import { PasswordField } from './PasswordField';

export interface LoginPayload {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (payload: LoginPayload) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="mb-2 text-[2.5rem] font-extrabold tracking-tight text-white">
        Welcome back.
      </h1>
      <p className="mb-7 text-[1.2rem] text-ink-300">
        Open your cases. Pull your cards. Build your collection.
      </p>

      <TextField
        id="login-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        id="login-password"
        label="Password"
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="mb-5 -mt-1.5 flex justify-end">
        <a
          href="#"
          className="text-[1rem] font-semibold text-brand-400 hover:underline"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-[1rem] font-extrabold text-white transition-transform hover:-translate-y-px active:translate-y-0"
      >
        OPEN YOUR COLLECTION
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </form>
  );
}
