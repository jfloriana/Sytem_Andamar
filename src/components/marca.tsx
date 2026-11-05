/** Marca de CRM-Andamar: nodos enlazados (la cartera) y el nombre. */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#8fb4ff" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 17 12 7l6 10M6 17h12" />
          <circle cx="6" cy="17" r="2.2" fill="#0a1730" />
          <circle cx="12" cy="7" r="2.2" fill="#0a1730" />
          <circle cx="18" cy="17" r="2.2" fill="#0a1730" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-white">CRM-Andamar</span>
    </span>
  );
}
