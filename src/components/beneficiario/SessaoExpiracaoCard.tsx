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
      onClick={onContinuar} // ← Clique no backdrop/fundo
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[30rem] rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,rgba(0,51,141,0.98)_0%,rgba(29,78,216,0.98)_58%,rgba(56,189,248,0.96)_100%)] p-6 text-center text-white shadow-[0_30px_60px_rgba(15,23,42,0.35)] md:p-8"
        onClick={(e) => e.stopPropagation()} // ← Impede que o clique no modal propague para o backdrop
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-amber-200/90 bg-white/10 text-[2rem] font-black text-amber-200">
          !
        </div>

        <p className="mt-5 text-[1.5rem] font-black uppercase tracking-[0.04em] md:text-[1.9rem]">
          {"Aten\u00e7\u00e3o"}
        </p>
        <p className="mt-3 text-[1rem] font-bold leading-relaxed text-blue-50 md:text-[1.18rem]">
          Encerrando por falta de interatividade. Toque na tela para permanecer.
        </p>

        <div className="mt-6 rounded-[1.4rem] border border-amber-200/55 bg-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <p className="text-[0.84rem] font-black uppercase tracking-[0.18em] text-amber-100 md:text-[0.92rem]">
            Encerrando em
          </p>
          <p className="mt-2 text-[2.5rem] font-black tracking-[0.08em] text-amber-200 md:text-[3rem]">
            {formatarTempoSessao(segundosRestantesInatividade)}
          </p>
        </div>

        <button
          type="button"
          onClick={onContinuar}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-[1.1rem] bg-white px-4 text-[0.95rem] font-black uppercase tracking-[0.04em] text-[#00338d] shadow-[0_16px_30px_rgba(255,255,255,0.2)] transition hover:brightness-95 md:text-[1rem]"
        >
          TOQUE EM QUALQUER PARTE DA TELA PARA PERMANECER
        </button>
      </div>
    </div>
  );
}