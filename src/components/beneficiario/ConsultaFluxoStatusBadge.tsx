import React from "react";

interface ConsultaFluxoStatusBadgeProps {
  visivel: boolean;
  tokenInlineVisivel: boolean;
  autorizacaoConcluida: boolean;
  tokenEnviadoNoFluxo: boolean;
  faltouConsulta: boolean;
  erroAutorizacao: boolean;
  consultaAtendida: boolean;
  statusAgendamento?: string | null;
  formatarStatus: (status?: string) => string;
}

const ConsultaFluxoStatusBadge: React.FC<ConsultaFluxoStatusBadgeProps> = ({
  visivel,
  tokenInlineVisivel,
  autorizacaoConcluida,
  tokenEnviadoNoFluxo,
  faltouConsulta,
  erroAutorizacao,
  consultaAtendida,
  statusAgendamento,
  formatarStatus,
}) => {
  if (!visivel) return null;

  const classeContainer = tokenInlineVisivel
    ? "min-h-7 px-3 py-1 text-[0.75rem] md:text-[0.85rem]"
    : "min-h-9 px-4 py-1.5 text-[0.82rem] md:text-[0.96rem]";

  const classeStatus = faltouConsulta
    ? "border-red-200 bg-red-50 text-red-700"
    : erroAutorizacao
    ? "border-red-400 bg-red-100 text-red-700"
    : tokenEnviadoNoFluxo && !autorizacaoConcluida
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : autorizacaoConcluida
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-blue-200 bg-blue-50 text-[#00338d]";

  const textoStatus = faltouConsulta
    ? "Consulta não realizada"
    : erroAutorizacao
    ? "PROCURE A RECEPÇÃO"
    : consultaAtendida
    ? "Atendido"
    : tokenEnviadoNoFluxo && !autorizacaoConcluida
    ? "AGUARDANDO SEU TOKEN"
    : autorizacaoConcluida
    ? "Atendimento liberado"
    : formatarStatus(statusAgendamento || undefined);

  const corIndicador = faltouConsulta || erroAutorizacao
    ? "bg-red-500"
    : tokenEnviadoNoFluxo
    ? "bg-amber-500"
    : "bg-[#00338d]";

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border text-center font-black uppercase tracking-[0.06em] shadow-[0_8px_14px_rgba(15,23,42,0.08)] ${classeContainer} ${classeStatus}`}
    >
      {!autorizacaoConcluida ? (
        <span
          aria-hidden="true"
          className={`inline-flex h-2.5 w-2.5 rounded-full ${corIndicador}`}
        />
      ) : null}
      {autorizacaoConcluida ? (
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[0.6rem] text-white"
        >
          {"\u2713"}
        </span>
      ) : null}
      {textoStatus}
    </p>
  );
};

export default ConsultaFluxoStatusBadge;
