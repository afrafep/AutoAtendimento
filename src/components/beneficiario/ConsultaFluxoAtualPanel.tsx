import React from "react";
import BeneficiarioConsultaFluxoCard from "./BeneficiarioConsultaFluxoCard";
import type {
  ConsultaAutoAtendimento,
  ConsultaFluxoItem,
} from "./autoatendimentoTypes";

const normalizarBoolean = (valor: unknown) => {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase();
  if (texto === "1" || texto === "true") return true;
  if (texto === "0" || texto === "false") return false;
  return Boolean(valor);
};

const possuiSenhaAutorizacao = (senhaAutorizacao: unknown) =>
  senhaAutorizacao != null && String(senhaAutorizacao).trim() !== "";

interface ConsultaFluxoAtualPanelProps {
  consultaFluxoAtual: ConsultaFluxoItem | null;
  consultaProcessandoSenhaId: number | null;
  consultaTokenAbertaId: number | null;
  tokenDigitadoPorConsulta: Record<number, string>;
  consultaReenviandoTokenId: number | null;
  consultaValidandoTokenId: number | null;
  consultaErroToastAtivoId: number | null;
  consultaTecladoTokenId: number | null;
  bloqueioReenvioAtePorConsulta: Record<number, number>;
  agoraReenvioToken: number;
  formatarHora: (hora?: string) => string;
  formatarStatus: (status?: string) => string;
  obterFaixaHorariosConsultas: (consultas: ConsultaAutoAtendimento[]) => string;
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

const ConsultaFluxoAtualPanel: React.FC<ConsultaFluxoAtualPanelProps> = ({
  consultaFluxoAtual,
  consultaProcessandoSenhaId,
  consultaTokenAbertaId,
  tokenDigitadoPorConsulta,
  consultaReenviandoTokenId,
  consultaValidandoTokenId,
  consultaErroToastAtivoId,
  consultaTecladoTokenId,
  bloqueioReenvioAtePorConsulta,
  agoraReenvioToken,
  formatarHora,
  formatarStatus,
  obterFaixaHorariosConsultas,
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
  if (!consultaFluxoAtual) {
    return null;
  }

  const { cardConsulta, consulta, autorizacaoConcluida } = consultaFluxoAtual;
  const statusAtual = String(consulta.statusAgendamento || "").toUpperCase();
  const faltouConsulta = statusAtual === "FALTOU";
  const compareceuConsulta = statusAtual === "COMPARECEU";
  const podeAutorizar = ["AGENDADO", "CONFIRMADO", "COMPARECEU"].includes(
    statusAtual,
  );
  const processandoSenha = consultaProcessandoSenhaId === consulta.idEvento;
  const tokenAberto = consultaTokenAbertaId === consulta.idEvento;
  const deveProcurarRecepcao =
    !normalizarBoolean(consulta.autorizado) &&
    !normalizarBoolean(consulta.tokenValidado) &&
    (possuiSenhaAutorizacao(consulta.senhaAutorizacao) ||
      consulta.erroAutorizacao === true);
  const tokenInlineVisivel =
    !autorizacaoConcluida &&
    consulta.erroAutorizacao !== true &&
    (processandoSenha || tokenAberto || normalizarBoolean(consulta.autorizado));
  const tokenEnviadoNoFluxo =
    normalizarBoolean(consulta.autorizado) && !autorizacaoConcluida;
  const podeSeguir =
    podeAutorizar || tokenInlineVisivel || autorizacaoConcluida;
  const tokenDigitado = tokenDigitadoPorConsulta[consulta.idEvento] || "";
  const reenviandoToken = consultaReenviandoTokenId === consulta.idEvento;
  const validandoToken = consultaValidandoTokenId === consulta.idEvento;
  const reenvioDesabilitadoPorErro =
    consultaErroToastAtivoId === consulta.idEvento;
  const tecladoTokenAberto = consultaTecladoTokenId === consulta.idEvento;
  const segundosRestantesReenvio = Math.max(
    0,
    Math.ceil(
      ((bloqueioReenvioAtePorConsulta[consulta.idEvento] || 0) -
        agoraReenvioToken) /
        1000,
    ),
  );

  return (
    <BeneficiarioConsultaFluxoCard
      cardConsulta={cardConsulta}
      consulta={consulta}
      autorizacaoConcluida={autorizacaoConcluida}
      processandoSenha={processandoSenha}
      tokenInlineVisivel={tokenInlineVisivel}
      tokenEnviadoNoFluxo={tokenEnviadoNoFluxo}
      faltouConsulta={faltouConsulta}
      compareceuConsulta={compareceuConsulta}
      deveProcurarRecepcao={deveProcurarRecepcao}
      podeSeguir={podeSeguir}
      tokenDigitado={tokenDigitado}
      reenviandoToken={reenviandoToken}
      validandoToken={validandoToken}
      reenvioDesabilitadoPorErro={reenvioDesabilitadoPorErro}
      tecladoTokenAberto={tecladoTokenAberto}
      segundosRestantesReenvio={segundosRestantesReenvio}
      formatarHora={formatarHora}
      formatarStatus={formatarStatus}
      obterFaixaHorariosConsultas={obterFaixaHorariosConsultas}
      atualizarTokenDigitadoInline={atualizarTokenDigitadoInline}
      handleTokenInlineKeyDown={handleTokenInlineKeyDown}
      handleTokenInlinePaste={handleTokenInlinePaste}
      abrirTecladoTokenInline={abrirTecladoTokenInline}
      fecharTecladoTokenInline={fecharTecladoTokenInline}
      preencherTokenViaTecladoInline={preencherTokenViaTecladoInline}
      limparTokenViaTecladoInline={limparTokenViaTecladoInline}
      reenviarTokenInline={reenviarTokenInline}
      validarTokenInline={validarTokenInline}
      abrirEtapaSenha={abrirEtapaSenha}
    />
  );
};

export default ConsultaFluxoAtualPanel;
