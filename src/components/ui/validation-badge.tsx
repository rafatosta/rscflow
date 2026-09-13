import { AlertTriangle } from 'lucide-react';

export function ValidationBadge({ tooltipId }: { tooltipId: string }) {
  return (
    <span className="group relative shrink-0">
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-500/70 bg-amber-950/20 px-3 py-2 text-sm font-semibold text-amber-200"
        aria-describedby={tooltipId}
      >
        <AlertTriangle size={14} aria-hidden="true" />
        Não validado
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="dialog-surface pointer-events-none invisible absolute right-0 top-full z-10 mt-2 w-72 max-w-[calc(100vw-3rem)] p-3 text-left text-sm font-normal leading-5 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        Pontuação provisória, ainda não validada por conferência humana.
        <span className="mt-1 block text-amber-200">Pendente de validação oficial.</span>
      </span>
    </span>
  );
}
