import { Headphones } from 'lucide-react';

export function Logo() {
  return (
    <div className="mb-8 flex items-center gap-2.5">
      <span className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-brand-500">
        <Headphones className="h-6 w-6 text-white" strokeWidth={4} />
      </span>
      <span className="text-[2.5rem] font-extrabold text-white">Soundcase</span>
    </div>
  );
}
