import React from "react";
import AutorizacaoPreparandoCard from "./AutorizacaoPreparandoCard";
import TokenInlinePanel from "./TokenInlinePanel";
import type { ConsultaAutoAtendimento } from "./autoatendimentoTypes";

interface ConsultaFluxoAcaoProps {
  consulta: ConsultaAutoAtendimento;
  autorizacaoConcluida: boolean;
  processandoSenha: boolean;
  tokenInlineVisivel: boolean;
  podeSeguir: boolean;
  faltouConsulta: boolean;
  consultaAtendida: boolean;
  deveProcurarRecepcao: boolean;
  tokenDigitado: string;
  reenviandoToken: boolean;
  validandoToken: boolean;
  reenvioDesabilitadoPorErro: boolean;
  tecladoTokenAberto: boolean;
  segundosRestantesReenvio: number;
  atualizarTokenDigitadoInline: (
    idEvento: number,
    indiceToken: number,
    valor: string,
  ) => void;
  handleTokenInlineKeyDown: (
    idEvento: number,
    indiceToken: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  handleTokenInlinePaste: (
    idEvento: number,
    event: React.ClipboardEvent<HTMLInputElement>,
  ) => void;
  abrirTecladoTokenInline: (idEvento: number, indice?: number) => void;
  fecharTecladoTokenInline: () => void;
  preencherTokenViaTecladoInline: (
    consulta: ConsultaAutoAtendimento,
    numero: string,
  ) => void;
  limparTokenViaTecladoInline: (idEvento: number) => void;
  reenviarTokenInline: (consulta: ConsultaAutoAtendimento) => Promise<void>;
  validarTokenInline: (consulta: ConsultaAutoAtendimento) => Promise<void>;
  abrirEtapaSenha: (consulta: ConsultaAutoAtendimento) => Promise<void>;
}

const ConsultaFluxoAcao: React.FC<ConsultaFluxoAcaoProps> = ({
  consulta,
  autorizacaoConcluida,
  processandoSenha,
  tokenInlineVisivel,
  podeSeguir,
  faltouConsulta,
  consultaAtendida,
  deveProcurarRecepcao,
  tokenDigitado,
  reenviandoToken,
  validandoToken,
  reenvioDesabilitadoPorErro,
  tecladoTokenAberto,
  segundosRestantesReenvio,
  atualizarTokenDigitadoInline,
  handleTokenInlineKeyDown,
  handleTokenInlinePaste,
  abrirTecladoTokenInline,
  fecharTecladoTokenInline,
  preencherTokenViaTecladoInline,
  limparTokenViaTecladoInline,
  reenviarTokenInline,
  validarTokenInline,
  abrirEtapaSenha,
}) => {
  if (autorizacaoConcluida) return null;

  if (processandoSenha) {
    return <AutorizacaoPreparandoCard />;
  }

  if (tokenInlineVisivel) {
    return (
      <div className="shrink-0">
        <TokenInlinePanel
          consulta={consulta}
          tokenDigitado={tokenDigitado}
          tecladoTokenAberto={tecladoTokenAberto}
          reenviandoToken={reenviandoToken}
          validandoToken={validandoToken}
          reenvioDesabilitadoPorErro={reenvioDesabilitadoPorErro}
          segundosRestantesReenvio={segundosRestantesReenvio}
          onTokenChange={(indiceToken, valor) =>
            atualizarTokenDigitadoInline(consulta.idEvento, indiceToken, valor)
          }
          onTokenKeyDown={(indiceToken, event) =>
            handleTokenInlineKeyDown(consulta.idEvento, indiceToken, event)
          }
          onTokenPaste={(event) =>
            handleTokenInlinePaste(consulta.idEvento, event)
          }
          onAbrirTeclado={(indiceToken) =>
            abrirTecladoTokenInline(consulta.idEvento, indiceToken)
          }
          onFecharTeclado={fecharTecladoTokenInline}
          onPreencherDigito={(digito) =>
            preencherTokenViaTecladoInline(consulta, digito)
          }
          onLimparToken={() => limparTokenViaTecladoInline(consulta.idEvento)}
          onReenviar={() => void reenviarTokenInline(consulta)}
          onValidar={() => void validarTokenInline(consulta)}
        />
      </div>
    );
  }

  if (podeSeguir) {
    return (
      <button
        onClick={() =>
          deveProcurarRecepcao ? undefined : void abrirEtapaSenha(consulta)
        }
        disabled={deveProcurarRecepcao}
        className={`mt-1.5 h-10 w-full shrink-0 px-4 text-[0.85rem] font-black text-white shadow-[0_8px_16px_rgba(0,51,141,0.14)] transition md:text-[1.3rem] ${
          deveProcurarRecepcao
            ? "cursor-not-allowed border-4 border-red-800 bg-red-600 text-white shadow-none"
            : "bg-[#00338d] hover:bg-[#00286f]"
        }`}
      >
        {deveProcurarRecepcao ? "PROCURE A RECEPÇÃO" : "INICIAR CONSULTA"}
      </button>
    );
  }

  return (
    <div
      className={`flex h-10 w-full shrink-0 items-center justify-center px-3 text-center text-[0.8rem] font-bold ${
        faltouConsulta
          ? "bg-red-50 text-red-600"
          : consultaAtendida
          ? "bg-blue-50 text-[#00338d]"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {faltouConsulta ? "Atendimento encerrado" : "Atendimento indisponível"}
    </div>
  );
};

export default ConsultaFluxoAcao;
