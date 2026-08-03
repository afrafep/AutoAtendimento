import SessaoExpiracaoCard from "./SessaoExpiracaoCard";

interface ConsultasHeaderProps {
  pacienteNome: string;
  dataConsultasCabecalho: string;
  segundosParaExpirarSessao: number;
  segundosRestantesInatividade: number;
  mostrarModalInatividade: boolean;
  formatarTempoSessao: (segundos: number) => string;
  onContinuarSessao: () => void;
  onEncerrarSessao: () => void;
  onSair: () => void;
}

export default function ConsultasHeader({
  pacienteNome,
  dataConsultasCabecalho,
  segundosParaExpirarSessao,
  segundosRestantesInatividade,
  mostrarModalInatividade,
  formatarTempoSessao,
  onContinuarSessao,
  onEncerrarSessao,
  onSair,
}: ConsultasHeaderProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1 text-center md:text-left">
        <p className="text-[0.98rem] font-black uppercase tracking-[0.18em] text-blue-100/85 md:text-[1.08rem]">
          Atendimentos do dia
        </p>
        <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">
          {pacienteNome || "Benefici\u00e1rio"}
        </h2>
        <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">
          {dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----"
            ? dataConsultasCabecalho
            : "Data do atendimento"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-end">
        <SessaoExpiracaoCard
          segundosParaExpirarSessao={segundosParaExpirarSessao}
          segundosRestantesInatividade={segundosRestantesInatividade}
          mostrarModalInatividade={mostrarModalInatividade}
          formatarTempoSessao={formatarTempoSessao}
          onContinuar={onContinuarSessao}
          onEncerrar={onEncerrarSessao}
        />
        <button
          onClick={onSair}
          className="h-12 min-w-[190px] rounded-2xl border border-red-300/35 bg-red-500/90 px-7 text-[0.9rem] font-bold text-white shadow-[0_10px_22px_rgba(127,29,29,0.18)] transition hover:bg-red-600 md:px-8 md:text-[0.96rem]"
        >
          SAIR
        </button>
      </div>
    </div>
  );
}
