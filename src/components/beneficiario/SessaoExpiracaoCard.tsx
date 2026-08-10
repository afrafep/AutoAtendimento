interface SessaoExpiracaoCardProps {
  mostrarModalInatividade: boolean;
  segundosRestantesInatividade: number;
  formatarTempoSessao: (segundos: number) => string;
  onContinuar: () => void;
}

export default function SessaoExpiracaoCard({
  mostrarModalInatividade,
  segundosRestantesInatividade,
  formatarTempoSessao,
  onContinuar,
}: SessaoExpiracaoCardProps) {
  if (!mostrarModalInatividade) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]"
      onClick={onContinuar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[30rem] rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,rgba(0,51,141,0.98)_0%,rgba(29,78,216,0.98)_58%,rgba(56,189,248,0.96)_100%)] p-6 text-center text-white shadow-[0_30px_60px_rgba(15,23,42,0.35)] md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-amber-200/90 bg-white/10 text-[2rem] font-black text-amber-200">
          !
        </div>

        <p className="mt-5 text-[1.5rem] font-black uppercase tracking-[0.04em] md:text-[1.9rem]">
          Atenção
        </p>
        <p className="mt-3 text-[1rem] font-bold leading-relaxed text-blue-50 md:text-[1.18rem]">
          Sua sessão está quase encerrando.
        </p>
        <p className="mt-2 text-[0.95rem] font-black uppercase tracking-[0.06em] text-amber-100 md:text-[1.05rem]">
          Clique em qualquer parte para continuar.
        </p>

        <div className="mt-6 rounded-[1.4rem] border border-amber-200/55 bg-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <p className="text-[0.84rem] font-black uppercase tracking-[0.18em] text-amber-100 md:text-[0.92rem]">
            Encerrando em
          </p>
          <p className="mt-2 text-[2.5rem] font-black tracking-[0.08em] text-amber-200 md:text-[3rem]">
            {formatarTempoSessao(segundosRestantesInatividade)}
          </p>
        </div>
      </div>
    </div>
  );
}
