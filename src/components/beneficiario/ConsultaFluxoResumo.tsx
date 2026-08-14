import React from "react";
import type {
  ConsultaAutoAtendimento,
  ConsultaCardAgrupado,
} from "./autoatendimentoTypes";

interface ConsultaFluxoResumoProps {
  cardConsulta: ConsultaCardAgrupado;
  consulta: ConsultaAutoAtendimento;
  tokenInlineVisivel: boolean;
  obterFaixaHorariosConsultas: (consultas: ConsultaAutoAtendimento[]) => string;
  formatarHora: (hora?: string) => string;
  localExibicao: string;
}

const ConsultaFluxoResumo: React.FC<ConsultaFluxoResumoProps> = ({
  cardConsulta,
  consulta,
  tokenInlineVisivel,
  obterFaixaHorariosConsultas,
  formatarHora,
  localExibicao,
}) => (
  <div
    className={`flex flex-1 flex-col items-center justify-center text-center ${
      tokenInlineVisivel ? "gap-0 py-1.5" : "gap-1 py-1"
    }`}
  >
    {cardConsulta.agrupadoUltrassom ? (
      <p className="text-[1.8rem] font-black uppercase leading-tight tracking-[0.05em] text-[#00338d] md:text-[2.2rem]">
        {obterFaixaHorariosConsultas(cardConsulta.consultasRelacionadas) ||
          "Horários do dia"}
      </p>
    ) : (
      <p
        className={`font-black leading-none tracking-tight text-[#00338d] ${
          tokenInlineVisivel
            ? "text-[2.65rem] md:text-[3.1rem]"
            : "text-[4.4rem] md:text-[5.3rem]"
        }`}
      >
        {formatarHora(consulta.horaInicio)}
      </p>
    )}

    <p
      className={`mt-0.5 max-w-[24ch] break-words font-black uppercase leading-[0.98] tracking-[0.01em] text-slate-900 ${
        tokenInlineVisivel
          ? "text-[1.82rem] md:text-[2.25rem]"
          : "text-[2.3rem] md:text-[2.75rem]"
      }`}
    >
      {consulta.profissionalNome}
    </p>

    <p
      className={`max-w-[24ch] break-words font-black uppercase leading-[1] text-[#180539] ${
        tokenInlineVisivel
          ? "text-[1.34rem] md:text-[1.72rem]"
          : "text-[1.35rem] md:text-[2.05rem]"
      }`}
    >
      {consulta.especialidadeNome}
    </p>

    <p
      className={`mt-0.5 max-w-[14ch] font-black leading-none text-[#00338d] ${
        tokenInlineVisivel
          ? "text-[1.55rem] md:text-[1.92rem]"
          : "text-[2.8rem] md:text-[3.2rem]"
      }`}
    >
      {localExibicao}
    </p>

    {consulta.erroAutorizacao === true && consulta.mensagemErroAutorizacao ? (
      <p className="mt-1 max-w-[90%] break-words text-xs text-red-500">
        {consulta.mensagemErroAutorizacao}
      </p>
    ) : null}
  </div>
);

export default ConsultaFluxoResumo;
