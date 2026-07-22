import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function PasswordField({
  label,
  id,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          {...inputProps}
          className="w-full rounded-[11px] border border-ink-600 bg-ink-800 px-4 py-3.5 pr-11 text-[1.1rem] text-ink-50 placeholder:text-ink-500 outline-none transition-shadow focus:border-brand-500/60 focus:ring-[3px] focus:ring-brand-500/15"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition-colors hover:text-ink-300"
        >
          {visible ? (
            <EyeOff className="h-[19px] w-[19px]" />
          ) : (
            <Eye className="h-[19px] w-[19px]" />
          )}
        </button>
      </div>
    </div>
  );
}
