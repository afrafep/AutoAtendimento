import React from "react";
import ModalAutorizacaoBeneficiario from "./ModalAutorizacaoBeneficiario";
import type { ConsultaAutoAtendimento } from "./autoatendimentoTypes";
import type { AgendaEvento } from "../../types/agenda";

interface BeneficiarioAutorizacaoModalHostProps {
  consulta: ConsultaAutoAtendimento | null;
  onClose: () => void;
  onAfterFlow: () => Promise<void>;
  iniciarAutomaticamente: boolean;
  abrirTokenInlineAposEnvio: boolean;
  criarEventoBaseDaConsulta: (
    consulta: ConsultaAutoAtendimento,
  ) => AgendaEvento;
  formatarData: (data?: string) => string;
  formatarHora: (hora?: string) => string;
}

const BeneficiarioAutorizacaoModalHost: React.FC<
  BeneficiarioAutorizacaoModalHostProps
> = ({
  consulta,
  onClose,
  onAfterFlow,
  iniciarAutomaticamente,
  abrirTokenInlineAposEnvio,
  criarEventoBaseDaConsulta,
  formatarData,
  formatarHora,
}) => {
  if (!consulta) {
    return null;
  }

  return (
    <ModalAutorizacaoBeneficiario
      consulta={consulta}
      onClose={onClose}
      onAfterFlow={onAfterFlow}
      iniciarAutomaticamente={iniciarAutomaticamente}
      abrirTokenInlineAposEnvio={abrirTokenInlineAposEnvio}
      criarEventoBaseDaConsulta={criarEventoBaseDaConsulta}
      formatarData={formatarData}
      formatarHora={formatarHora}
    />
  );
};

export default BeneficiarioAutorizacaoModalHost;
