import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, ...inputProps }: TextFieldProps) {
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-2 block text-[1rem] font-bold uppercase tracking-wider text-ink-400"
      >
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className="w-full rounded-[11px] border border-ink-600 bg-ink-800 px-4 py-3.5 text-[1.1rem] text-ink-50 placeholder:text-ink-500 outline-none transition-shadow focus:border-brand-500/60 focus:ring-[3px] focus:ring-brand-500/15"
      />
    </div>
  );
}
