import { ChevronRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useActionState, useState } from 'react';

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

interface SignupFormProps {
  onSubmit: (payload: SignupPayload) => void;
}

export function SignupForm({ onSubmit }: SignupFormProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [, formAction, isPending] = useActionState(
    async (_prevState: null, formData: FormData) => {
      const username = formData.get('username') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      onSubmit({ username, email, password });
      return null;
    },
    null
  );

  return (
    <form action={formAction}>
      <h1 className="mb-2 text-[2.5rem] font-extrabold tracking-tight text-white">
        Start collecting.
      </h1>
      <p className="mb-7 text-[1.2rem] leading-snug text-ink-300">
        Create an account and open your first case free.
      </p>

      <div className="mb-5">
        <label
          htmlFor="su-username"
          className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
        >
          Username
        </label>
        <input
          id="su-username"
          name="username"
          placeholder="yourhandle"
          autoComplete="username"
          defaultValue=""
          required
          className="w-full rounded-[11px] border border-ink-600 bg-ink-800 px-4 py-3.5 text-[1.1rem] text-ink-50 placeholder:text-ink-500 outline-none transition-shadow focus:border-brand-500/60 focus:ring-[3px] focus:ring-brand-500/15"
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="su-email"
          className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
        >
          Email
        </label>
        <input
          id="su-email"
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
          htmlFor="su-password"
          className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="su-password"
            name="password"
            type={passwordVisible ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
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

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-[1rem] font-extrabold text-white transition-transform hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
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
