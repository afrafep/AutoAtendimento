import React from "react";
import SessaoExpiracaoCard from "./SessaoExpiracaoCard";
import TokenErroModal from "./TokenErroModal";
import type { TokenErroModalState } from "./autoatendimentoTypes";

interface BeneficiarioOverlayHostProps {
  tokenErroModal: TokenErroModalState | null;
  fecharModalErroTokenInline: () => void;
  mostrarModalInatividade: boolean;
  segundosRestantesInatividade: number;
  formatarTempoSessao: (segundos: number) => string;
  reiniciarTemporizadorSessao: () => void;
}

const BeneficiarioOverlayHost: React.FC<BeneficiarioOverlayHostProps> = ({
  tokenErroModal,
  fecharModalErroTokenInline,
  mostrarModalInatividade,
  segundosRestantesInatividade,
  formatarTempoSessao,
  reiniciarTemporizadorSessao,
}) => (
  <>
    <TokenErroModal
      tokenErroModal={tokenErroModal}
      onClose={fecharModalErroTokenInline}
    />

    <SessaoExpiracaoCard
      mostrarModalInatividade={mostrarModalInatividade}
      segundosRestantesInatividade={segundosRestantesInatividade}
      formatarTempoSessao={formatarTempoSessao}
      onContinuar={reiniciarTemporizadorSessao}
    />
  </>
);

export default BeneficiarioOverlayHost;
