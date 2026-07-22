import { ChevronRight, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { TextField } from './TextField';
import { PasswordField } from './PasswordField';

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

interface SignupFormProps {
  onSubmit: (payload: SignupPayload) => void;
}

export function SignupForm({ onSubmit }: SignupFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ username, email, password });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="mb-2 text-[2.5rem] font-extrabold tracking-tight text-white">
        Start collecting.
      </h1>
      <p className="mb-7 text-[1.2rem] leading-snug text-ink-300">
        Create an account and open your first case free.
      </p>

      <TextField
        id="su-username"
        label="Username"
        placeholder="yourhandle"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <TextField
        id="su-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        id="su-password"
        label="Password"
        placeholder="••••••••"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-[1rem] font-extrabold text-white transition-transform hover:-translate-y-px active:translate-y-0"
      >
        CREATE ACCOUNT
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <div className="mt-4 flex gap-2.5 rounded-xl border border-brand-500/25 bg-brand-500/10 p-4">
        <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-500" />
        <p className="text-[.95rem] leading-snug text-ink-200">
          New accounts get a{' '}
          <strong className="text-brand-200">free Legendary case</strong> on
          sign up. Pull your first rare card today!
        </p>
      </div>
    </form>
  );
}
