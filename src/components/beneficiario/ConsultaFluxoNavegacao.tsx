interface ConsultaFluxoNavegacaoProps {
  podeVoltar: boolean;
  podeAvancar: boolean;
  onVoltar: () => void;
  onAvancar: () => void;
}

export default function ConsultaFluxoNavegacao({
  podeVoltar,
  podeAvancar,
  onVoltar,
  onAvancar,
}: ConsultaFluxoNavegacaoProps) {
  return (
    <div className="shrink-0 px-3 py-1.5 md:px-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVoltar}
          disabled={!podeVoltar}
          className={`min-w-[144px] rounded-[1rem] border px-4 py-2 text-[0.82rem] font-black uppercase transition ${
            !podeVoltar
              ? "border-slate-300 bg-white text-slate-400"
              : "border-blue-200/60 bg-[linear-gradient(135deg,#00338d_0%,#1d4ed8_58%,#38bdf8_100%)] text-white shadow-[0_10px_20px_rgba(0,51,141,0.16)] hover:brightness-105"
          } disabled:cursor-not-allowed disabled:shadow-none`}
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onAvancar}
          disabled={!podeAvancar}
          className={`min-w-[144px] rounded-[1rem] border px-4 py-2 text-[0.82rem] font-black uppercase transition ${
            !podeAvancar
              ? "border-slate-300 bg-white text-slate-400"
              : "border-blue-200/60 bg-[linear-gradient(135deg,#00338d_0%,#1d4ed8_58%,#38bdf8_100%)] text-white shadow-[0_10px_20px_rgba(0,51,141,0.16)] hover:brightness-105"
          } disabled:cursor-not-allowed disabled:shadow-none`}
        >
          {"Pr\u00f3ximo"}
        </button>
      </div>
    </div>
  );
}
