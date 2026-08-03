interface ConsultaResumoProps {
  profissionalNome: string;
  especialidadeNome: string;
}

function ConsultaResumoCompacto({ profissionalNome, especialidadeNome }: ConsultaResumoProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-[0.95rem] border border-slate-200 bg-white/75 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#00338d] md:text-[0.72rem]">
        Atendimento selecionado
      </p>
      <p className="mt-1 text-[1rem] font-black uppercase tracking-[0.03em] text-slate-900 md:text-[1.08rem]">
        {profissionalNome}
      </p>
      <p className="mt-0.5 text-[0.8rem] font-bold uppercase tracking-[0.05em] text-slate-600 md:text-[0.86rem]">
        {especialidadeNome}
      </p>
    </div>
  );
}

interface AutorizacaoPreparandoCardProps extends ConsultaResumoProps {}

export default function AutorizacaoPreparandoCard({
  profissionalNome,
  especialidadeNome,
}: AutorizacaoPreparandoCardProps) {
  return (
    <div className="mt-2 rounded-[1rem] border border-blue-200 bg-[linear-gradient(135deg,rgba(219,234,254,0.82)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 text-center shadow-[0_14px_28px_rgba(59,130,246,0.14)]">
      <ConsultaResumoCompacto
        profissionalNome={profissionalNome}
        especialidadeNome={especialidadeNome}
      />
      <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#00338d]/10">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#00338d]/20 border-t-[#00338d]" />
      </div>
      <p className="mt-3 text-[1.04rem] font-black uppercase tracking-[0.06em] text-[#00338d] md:text-[1.12rem]">
        {"Preparando autoriza\u00e7\u00e3o"}
      </p>
      <p className="mt-2 text-[0.9rem] text-slate-600 md:text-[0.96rem]">
        {"Aguarde um instante. O token ser\u00e1 enviado e a valida\u00e7\u00e3o vai aparecer aqui na mesma tela."}
      </p>
    </div>
  );
}
