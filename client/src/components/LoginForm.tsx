import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useActionState, useState } from 'react';

export interface LoginPayload {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (payload: LoginPayload) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [, formAction, isPending] = useActionState(
    async (_prevState: null, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      onSubmit({ email, password });
      return null;
    },
    null
  );

  return (
    <form action={formAction}>
      <h1 className="mb-2 text-[2.5rem] font-extrabold tracking-tight text-white">
        Welcome back.
      </h1>
      <p className="mb-7 text-[1.2rem] text-ink-300">
        Open your cases. Pull your cards. Build your collection.
      </p>

      <div className="mb-5">
        <label
          htmlFor="login-email"
          className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
        >
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          defaultValue=""
          required
          className="w-full rounded-[11px] border border-ink-600 bg-ink-800 px-4 py-3.5 text-[1.1rem] text-ink-50 placeholder:text-ink-500 outline-none transition-shadow focus:border-brand-500/60 focus:ring-[3px] focus:ring-brand-500/15"
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="login-password"
          className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={passwordVisible ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            defaultValue=""
            required
            className="w-full rounded-[11px] border border-ink-600 bg-ink-800 px-4 py-3.5 pr-11 text-[1.1rem] text-ink-50 placeholder:text-ink-500 outline-none focus:border-brand-500/60 focus:ring-[3px] focus:ring-brand-500/15"
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition-colors hover:text-ink-300"
          >
            {passwordVisible ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

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
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-[1rem] font-extrabold text-white transition-transform hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        OPEN YOUR COLLECTION
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </form>
  );
}
