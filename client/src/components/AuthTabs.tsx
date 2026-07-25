import { Headphones } from 'lucide-react';

export type AuthMode = 'login' | 'signup';

interface AuthTabsProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

export function AuthTabs({ mode, onChange }: AuthTabsProps) {
  const tabClass = (tab: AuthMode) =>
    `flex-1 rounded-[9px] py-3.5 text-[1rem] font-extrabold tracking-wider transition-colors ${
      mode === tab
        ? 'bg-brand-500 text-white'
        : 'text-ink-300 hover:text-ink-100'
    }`;

  return (
    <>
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-brand-500">
          <Headphones className="h-6 w-6 text-white" strokeWidth={4} />
        </span>
        <span className="text-[2.5rem] font-extrabold text-white">
          Soundcase
        </span>
      </div>

      <div className="mb-6 flex gap-1 rounded-[11px] border border-ink-600 bg-ink-800 p-1">
        <button
          type="button"
          className={tabClass('login')}
          onClick={() => onChange('login')}
        >
          LOG IN
        </button>
        <button
          type="button"
          className={tabClass('signup')}
          onClick={() => onChange('signup')}
        >
          SIGN UP
        </button>
      </div>
    </>
  );
}
