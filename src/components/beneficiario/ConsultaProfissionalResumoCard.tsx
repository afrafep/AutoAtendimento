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
      className={`border px-4 py-5 text-center ${
        autorizacaoConcluida
          ? "border-emerald-100 bg-white/80"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p className="text-[1.6rem] font-black uppercase tracking-[0.09em] text-slate-900 md:text-[1.9rem]">
        {profissionalNome}
      </p>
      <p className="mt-3 text-[1.5rem] font-black uppercase tracking-[0.09em] text-slate-900 md:text-[1.9rem]">
        {especialidadeNome}
      </p>
    </div>
  );
}
