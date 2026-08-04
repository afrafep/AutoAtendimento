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
      className={`border px-4 py-4 text-center ${
        autorizacaoConcluida
          ? "border-emerald-100 bg-white/80"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p className="text-[1.9rem] font-black uppercase leading-[1.05] tracking-[0.06em] text-slate-900 md:text-[2.25rem]">
        {profissionalNome}
      </p>
      <p className="mt-2 text-[1.7rem] font-black uppercase leading-[1.05] tracking-[0.06em] text-slate-900 md:text-[2.05rem]">
        {especialidadeNome}
      </p>
    </div>
  );
}


