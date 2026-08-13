import React from "react";
import BeneficiarioConsultasScreen from "./BeneficiarioConsultasScreen";
import BeneficiarioCpfScreen from "./BeneficiarioCpfScreen";
import BeneficiarioSenhaScreen from "./BeneficiarioSenhaScreen";
import ConsultaFluxoAtualPanel from "./ConsultaFluxoAtualPanel";
import type {
  ConsultaAutoAtendimento,
  ConsultaFluxoItem,
} from "./autoatendimentoTypes";
import type { EtapaTelaAutoAtendimento } from "./autoatendimentoHelpers";

interface BeneficiarioEtapaContentProps {
  etapaTela: EtapaTelaAutoAtendimento;
  mostrarTelaBoasVindasCpf: boolean;
  animandoSaidaTelaBoasVindasCpf: boolean;
  abrirEntradaCpf: () => void;
  dataCabecalhoAtual: string;
  horaCabecalhoAtual: string;
  inputCpfRef: React.RefObject<HTMLInputElement | null>;
  cpf: string;
  handleCpfChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCpfKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCpfPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  buscarConsultas: () => Promise<void>;
  setMostrarTecladoCpf: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarTecladoCpf: boolean;
  loading: boolean;
  adicionarDigitoCpf: (digito: string) => void;
  apagarUltimoDigitoCpf: () => void;
  pacienteNome: string;
  dataConsultasCabecalho: string;
  confirmarEncerramentoAutoAtendimento: () => Promise<void>;
  mensagemFluxoConsultas: string;
  cardsConsultasFluxo: ConsultaFluxoItem[];
  indiceConsultaAtual: number;
  indiceMaximoLiberado: number;
  setIndiceConsultaAtual: React.Dispatch<React.SetStateAction<number>>;
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
  obterFaixaHorariosConsultas: (
    consultas: ConsultaAutoAtendimento[],
  ) => string;
  atualizarTokenDigitadoInline: (
    idEvento: number,
    indice: number,
    valor: string,
  ) => void;
  handleTokenInlineKeyDown: (
    idEvento: number,
    indice: number,
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
  consultaSelecionada: ConsultaAutoAtendimento | null;
  senhaPainelDigitada: string;
  formatarData: (data?: string) => string;
  atualizarTextoSenhaPainel: (idEvento: number, valor: string) => void;
  vincularSenhaPainel: () => Promise<void>;
  abrirValidacaoTokenDireta: (consulta: ConsultaAutoAtendimento) => void;
  voltarParaConsultas: () => void;
}

const BeneficiarioEtapaContent: React.FC<BeneficiarioEtapaContentProps> = ({
  etapaTela,
  mostrarTelaBoasVindasCpf,
  animandoSaidaTelaBoasVindasCpf,
  abrirEntradaCpf,
  dataCabecalhoAtual,
  horaCabecalhoAtual,
  inputCpfRef,
  cpf,
  handleCpfChange,
  handleCpfKeyDown,
  handleCpfPaste,
  buscarConsultas,
  setMostrarTecladoCpf,
  mostrarTecladoCpf,
  loading,
  adicionarDigitoCpf,
  apagarUltimoDigitoCpf,
  pacienteNome,
  dataConsultasCabecalho,
  confirmarEncerramentoAutoAtendimento,
  mensagemFluxoConsultas,
  cardsConsultasFluxo,
  indiceConsultaAtual,
  indiceMaximoLiberado,
  setIndiceConsultaAtual,
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
  consultaSelecionada,
  senhaPainelDigitada,
  formatarData,
  atualizarTextoSenhaPainel,
  vincularSenhaPainel,
  abrirValidacaoTokenDireta,
  voltarParaConsultas,
}) => (
  <div className="flex w-full flex-1 transition-all duration-200">
    {etapaTela === "cpf" && (
      <BeneficiarioCpfScreen
        mostrarTelaBoasVindasCpf={mostrarTelaBoasVindasCpf}
        animandoSaidaTelaBoasVindasCpf={animandoSaidaTelaBoasVindasCpf}
        abrirEntradaCpf={abrirEntradaCpf}
        dataCabecalhoAtual={dataCabecalhoAtual}
        horaCabecalhoAtual={horaCabecalhoAtual}
        inputCpfRef={inputCpfRef}
        cpf={cpf}
        handleCpfChange={handleCpfChange}
        handleCpfKeyDown={handleCpfKeyDown}
        handleCpfPaste={handleCpfPaste}
        buscarConsultas={buscarConsultas}
        setMostrarTecladoCpf={setMostrarTecladoCpf}
        mostrarTecladoCpf={mostrarTecladoCpf}
        loading={loading}
        adicionarDigitoCpf={adicionarDigitoCpf}
        apagarUltimoDigitoCpf={apagarUltimoDigitoCpf}
      />
    )}

    {etapaTela === "consultas" && (
      <BeneficiarioConsultasScreen
        pacienteNome={pacienteNome}
        dataConsultasCabecalho={dataConsultasCabecalho}
        onSair={() => void confirmarEncerramentoAutoAtendimento()}
        mensagemFluxo={mensagemFluxoConsultas}
        totalConsultas={cardsConsultasFluxo.length}
        indiceConsultaAtual={indiceConsultaAtual}
        indiceMaximoLiberado={indiceMaximoLiberado}
        setIndiceConsultaAtual={setIndiceConsultaAtual}
      >
        <ConsultaFluxoAtualPanel
          consultaFluxoAtual={consultaFluxoAtual}
          consultaProcessandoSenhaId={consultaProcessandoSenhaId}
          consultaTokenAbertaId={consultaTokenAbertaId}
          tokenDigitadoPorConsulta={tokenDigitadoPorConsulta}
          consultaReenviandoTokenId={consultaReenviandoTokenId}
          consultaValidandoTokenId={consultaValidandoTokenId}
          consultaErroToastAtivoId={consultaErroToastAtivoId}
          consultaTecladoTokenId={consultaTecladoTokenId}
          bloqueioReenvioAtePorConsulta={bloqueioReenvioAtePorConsulta}
          agoraReenvioToken={agoraReenvioToken}
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
      </BeneficiarioConsultasScreen>
    )}

    {etapaTela === "senha" && consultaSelecionada && (
      <BeneficiarioSenhaScreen
        consultaSelecionada={consultaSelecionada}
        dataConsultasCabecalho={dataConsultasCabecalho}
        formatarData={formatarData}
        formatarHora={formatarHora}
        senhaPainelDigitada={senhaPainelDigitada}
        atualizarTextoSenhaPainel={atualizarTextoSenhaPainel}
        vincularSenhaPainel={vincularSenhaPainel}
        abrirValidacaoTokenDireta={abrirValidacaoTokenDireta}
        voltarParaConsultas={voltarParaConsultas}
      />
    )}
  </div>
);

export default BeneficiarioEtapaContent;
