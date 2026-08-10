interface CpfTecladoNumericoProps {
  loading: boolean;
  onAdicionarDigito: (digito: string) => void;
  onApagarUltimo: () => void;
}

export default function CpfTecladoNumerico({
  loading,
  onAdicionarDigito,
  onApagarUltimo,
}: CpfTecladoNumericoProps) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_22px_36px_rgba(15,23,42,0.12)] md:p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-slate-600">
          Teclado numérico
        </p>
        <p className="text-[0.76rem] font-semibold text-slate-400">
          Toque para digitar
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-3.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
          <button
            key={`cpf-tecla-${digito}`}
            type="button"
            onClick={() => onAdicionarDigito(digito)}
            className="flex h-14 items-center justify-center rounded-[1rem] border border-slate-700 bg-[linear-gradient(180deg,#0b1020_0%,#17213a_100%)] text-[1.72rem] font-black text-white shadow-[0_12px_22px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_16px_28px_rgba(15,23,42,0.24)] md:h-[3.9rem] md:text-[1.9rem]"
          >
            {digito}
          </button>
        ))}

        <button
          type="button"
          onClick={onApagarUltimo}
          className="flex h-14 items-center justify-center rounded-[1rem] border border-red-700 bg-[linear-gradient(180deg,#ef4444_0%,#b91c1c_100%)] px-2 text-[0.78rem] font-black uppercase tracking-[0.06em] text-white shadow-[0_12px_20px_rgba(185,28,28,0.2)] transition hover:-translate-y-0.5 hover:border-red-800 hover:shadow-[0_16px_26px_rgba(185,28,28,0.24)] md:h-[3.9rem] md:text-[0.84rem]"
        >
          APAGAR
        </button>

        <button
          type="button"
          onClick={() => onAdicionarDigito("0")}
          className="flex h-14 items-center justify-center rounded-[1rem] border border-slate-700 bg-[linear-gradient(180deg,#0b1020_0%,#17213a_100%)] text-[1.72rem] font-black text-white shadow-[0_12px_22px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_16px_28px_rgba(15,23,42,0.24)] md:h-[3.9rem] md:text-[1.9rem]"
        >
          0
        </button>

        <div className="hidden md:block" />
      </div>

      {loading ? (
        <div className="mt-3 flex h-12 w-full items-center justify-center rounded-[1rem] border border-blue-200/60 bg-[linear-gradient(135deg,#00338d_0%,#1d4ed8_48%,#38bdf8_100%)] px-5 text-[0.84rem] font-black uppercase tracking-[0.05em] text-white shadow-[0_16px_26px_rgba(37,99,235,0.22)] md:h-13 md:text-[0.88rem]">
          Acessando...
        </div>
      ) : null}
    </div>
  );
}
