interface ConsultaProfissionalResumoCardProps {
  profissionalNome: string;
  especialidadeNome: string;
  autorizacaoConcluida: boolean;
}

export default function ConsultaProfissionalResumoCard({
  profissionalNome,
  especialidadeNome,
  autorizacaoConcluida,
}: ConsultaProfissionalResumoCardProps) {
  return (
    <div
      className={`border px-4 py-6 text-center ${
        autorizacaoConcluida
          ? "border-emerald-100 bg-white/80"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p className="text-[1.95rem] font-black uppercase tracking-[0.08em] text-slate-900 md:text-[2.35rem]">
        {profissionalNome}
      </p>
      <p className="mt-3 text-[1.85rem] font-black uppercase tracking-[0.08em] text-slate-900 md:text-[2.25rem]">
        {especialidadeNome}
      </p>
    </div>
  );
}

