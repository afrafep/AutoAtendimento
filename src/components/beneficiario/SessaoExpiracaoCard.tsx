interface SessaoExpiracaoCardProps {
  segundosParaExpirarSessao: number;
  segundosRestantesInatividade: number;
  mostrarModalInatividade: boolean;
  formatarTempoSessao: (segundos: number) => string;
  onContinuar: () => void;
  onEncerrar: () => void;
}

export default function SessaoExpiracaoCard({
  segundosParaExpirarSessao,
  segundosRestantesInatividade,
  mostrarModalInatividade,
  formatarTempoSessao,
  onContinuar,
  onEncerrar,
}: SessaoExpiracaoCardProps) {
  return (
    <div className="relative w-full sm:w-auto">
      <div className="inline-flex min-w-[176px] flex-col items-center justify-center rounded-[1.1rem] border border-white/20 bg-white/10 px-4 py-2 text-center shadow-[0_10px_20px_rgba(15,23,42,0.14)] backdrop-blur">
        <span className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-blue-100/90 md:text-[0.62rem]">
          {"SESS\u00c3O EXPIRA EM"}
        </span>
        <span className="mt-1 text-[1rem] font-black tracking-[0.06em] text-white md:text-[1.12rem]">
          {formatarTempoSessao(segundosParaExpirarSessao)}
        </span>
      </div>

      {mostrarModalInatividade && (
        <div className="absolute left-1/2 top-0 z-40 w-[260px] -translate-x-1/2 rounded-[1.4rem] border border-white/25 bg-[linear-gradient(135deg,rgba(0,51,141,0.98)_0%,rgba(29,78,216,0.98)_55%,rgba(56,189,248,0.96)_100%)] p-4 text-center text-white shadow-[0_22px_40px_rgba(15,23,42,0.28)] sm:left-auto sm:right-0 sm:translate-x-0">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-200/80 bg-white/12 text-[1.2rem] font-black text-amber-200">
            !
          </div>
          <p className="mt-3 text-[1rem] font-black uppercase tracking-[0.04em]">
            {"VOC\u00ca T\u00c1 A\u00cd?"}
          </p>
          <p className="mt-1 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-blue-100/90">
            {"ENCERRANDO EM..."}
          </p>
          <p className="mt-2 text-[2rem] font-black tracking-[0.08em] text-amber-200">
            {formatarTempoSessao(segundosRestantesInatividade)}
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={onContinuar}
              className="h-10 rounded-[0.9rem] bg-white px-4 text-[0.8rem] font-black uppercase text-[#00338d] shadow-[0_10px_18px_rgba(255,255,255,0.2)] transition hover:brightness-95"
            >
              CONTINUAR
            </button>
            <button
              type="button"
              onClick={onEncerrar}
              className="h-10 rounded-[0.9rem] border border-white/30 bg-white/10 px-4 text-[0.76rem] font-black uppercase text-white transition hover:bg-white/15"
            >
              ENCERRAR AGORA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
