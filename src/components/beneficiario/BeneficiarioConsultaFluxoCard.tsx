import React from "react";
import ConsultaFluxoAcao from "./ConsultaFluxoAcao";
import ConsultaFluxoResumo from "./ConsultaFluxoResumo";
import ConsultaFluxoStatusBadge from "./ConsultaFluxoStatusBadge";
import type {
  ConsultaAutoAtendimento,
  ConsultaCardAgrupado,
} from "./autoatendimentoTypes";

const LOCAL_MAP: Record<string, string> = {
  fisioterapeuta: "SUBSOLO",
  "fisioterapeuta sad": "SUBSOLO",
  "fisoterapeuta sad": "SUBSOLO",
  "terapeuta ocupacional": "SUBSOLO",
  "terapeuta ocupacional infantil": "SUBSOLO",
  "terapia ocupacional": "SUBSOLO",
  "terapia ocupacional infantil": "SUBSOLO",
  osteopatia: "SUBSOLO",
  quiropata: "SUBSOLO",
  dermatologista: "1º ANDAR",
  psicologo: "1º ANDAR",
  "psicologo sad": "1º ANDAR",
  "psicologia infantil": "1º ANDAR",
  psiquiatra: "1º ANDAR",
  "psiquiatra infantil": "1º ANDAR",
  fonoaudiologo: "1º ANDAR",
  "fonoaudiologo sad": "1º ANDAR",
  foniatra: "1º ANDAR",
  nutricionista: "1º ANDAR",
  "nutricionista sad": "1º ANDAR",
  "nutri maternoinfantil": "1º ANDAR",
  ortoptista: "1º ANDAR",
  ultrassonografista: "TÉRREO",
  "medico ultrassonografista": "TÉRREO",
  cardiologista: "TÉRREO",
  "clinico geral": "TÉRREO",
  "clinico geral / cardiologia": "TÉRREO",
  "medico da familia": "TÉRREO",
  "medico da família": "TÉRREO",
  "medico da dor": "TÉRREO",
  "procedimento medico da dor": "TÉRREO",
  enfermeiro: "TÉRREO",
  "enfermeiro sad": "TÉRREO",
  "tecnico de enfermagem": "TÉRREO",
  "vacinação": "TÉRREO",
  "vacinação influenza jp": "TÉRREO",
  "vacinação prevenar 13- jp": "TÉRREO",
  "vacinacao herpes zoster": "TÉRREO",
  "vacina herpes zoster": "TÉRREO",
  "teste ergométrico": "TÉRREO",
  ecocardiograma: "TÉRREO",
  mapa: "TÉRREO",
  holter: "TÉRREO",
  "exame antígeno": "TÉRREO",
  "procedimento dermatologico": "TÉRREO",
  "procedimento oftalmologico": "TÉRREO",
  oftalmologista: "TÉRREO",
  "oftalmologista infantil": "TÉRREO",
  ginecologista: "TÉRREO",
  obstetra: "TÉRREO",
  "ginecologista / obstetra": "TÉRREO",
  urologista: "TÉRREO",
  otorrinolaringologista: "TÉRREO",
  ortopedista: "TÉRREO",
  neurologista: "TÉRREO",
  "neurologista infantil": "TÉRREO",
  neurocirurgiao: "TÉRREO",
  endocrinologista: "TÉRREO",
  "endocrinologia infantil": "TÉRREO",
  gastroenterologista: "TÉRREO",
  endoscopista: "TÉRREO",
  "endoscopia e colonoscopia": "TÉRREO",
  pneumologista: "TÉRREO",
  reumatologista: "TÉRREO",
  nefrologista: "TÉRREO",
  infectologista: "TÉRREO",
  hematologista: "TÉRREO",
  "oncologista clinico": "TÉRREO",
  "oncologista cirurgico": "TÉRREO",
  "oncologista pediatrico": "TÉRREO",
  radiologista: "TÉRREO",
  radioterapeuta: "TÉRREO",
  anestesista: "TÉRREO",
  cirurgiao: "TÉRREO",
  "cirurgiao cardiovascular": "TÉRREO",
  "cirurgiao de cabeca e pescoco": "TÉRREO",
  "cirurgiao de mao": "TÉRREO",
  "cirurgiao do aparelho digestivo": "TÉRREO",
  "cirurgiao pediatrico": "TÉRREO",
  "cirurgiao plastico": "TÉRREO",
  "cirurgiao toracico": "TÉRREO",
  "cirurgiao vascular": "TÉRREO",
  angiologista: "TÉRREO",
  "medico do trabalho": "TÉRREO",
  "medico legista": "TÉRREO",
  "medico nuclear": "TÉRREO",
  "medico sad": "TÉRREO",
  plantonista: "TÉRREO",
  "pericias medicas": "TÉRREO",
  "saude da familia": "TÉRREO",
  "geral comunitario": "TÉRREO",
  geriatra: "TÉRREO",
  pediatra: "TÉRREO",
  mastologista: "TÉRREO",
  proctologista: "TÉRREO",
  fisiatra: "TÉRREO",
  "alergista/imunologista": "TÉRREO",
  anatopatologista: "TÉRREO",
  broncoesofalogista: "TÉRREO",
  cancerologista: "TÉRREO",
  citopatologista: "TÉRREO",
  "medicina esportiva/ nutrologia": "TÉRREO",
  "geneticista clinico": "TÉRREO",
  hansenologista: "TÉRREO",
  hemoterapeuta: "TÉRREO",
  homeopata: "TÉRREO",
  intensivista: "TÉRREO",
  "patologista clinico": "TÉRREO",
  sanitarista: "TÉRREO",
  veterinario: "TÉRREO",
  acupunturista: "TÉRREO",
  nutrologista: "TÉRREO",
  "nutricionista (saude em acao cg)": "TÉRREO",
  "nutricionista (saude em acao patos)": "TÉRREO",
  "outros profissionais nao classificaveis nessa tabela (padrao)": "TÉRREO",
  "sem preferência": "TÉRREO",
  procedimento: "TÉRREO",
  sad: "TÉRREO",
  medico: "TÉRREO",
};

interface BeneficiarioConsultaFluxoCardProps {
  cardConsulta: ConsultaCardAgrupado;
  consulta: ConsultaAutoAtendimento;
  autorizacaoConcluida: boolean;
  processandoSenha: boolean;
  tokenInlineVisivel: boolean;
  tokenEnviadoNoFluxo: boolean;
  faltouConsulta: boolean;
  compareceuConsulta: boolean;
  deveProcurarRecepcao: boolean;
  podeSeguir: boolean;
  tokenDigitado: string;
  reenviandoToken: boolean;
  validandoToken: boolean;
  reenvioDesabilitadoPorErro: boolean;
  tecladoTokenAberto: boolean;
  segundosRestantesReenvio: number;
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

const resolverLocalExibicao = (consulta: ConsultaAutoAtendimento) => {
  const especialidade = consulta.especialidadeNome?.toLowerCase() || "";

  for (const [key, value] of Object.entries(LOCAL_MAP)) {
    if (especialidade.includes(key)) {
      return value;
    }
  }

  if (consulta.localidadePainel) {
    return consulta.localidadePainel;
  }

  return "Local não informado";
};

const BeneficiarioConsultaFluxoCard: React.FC<
  BeneficiarioConsultaFluxoCardProps
> = ({
  cardConsulta,
  consulta,
  autorizacaoConcluida,
  processandoSenha,
  tokenInlineVisivel,
  tokenEnviadoNoFluxo,
  faltouConsulta,
  compareceuConsulta,
  deveProcurarRecepcao,
  podeSeguir,
  tokenDigitado,
  reenviandoToken,
  validandoToken,
  reenvioDesabilitadoPorErro,
  tecladoTokenAberto,
  segundosRestantesReenvio,
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
  const consultaAtendida =
    String(consulta.statusAgendamento || "").toUpperCase() === "ATENDIDO";
  const statusBadgeVisivel =
    !compareceuConsulta ||
    tokenEnviadoNoFluxo ||
    autorizacaoConcluida ||
    faltouConsulta;
  const localExibicao = resolverLocalExibicao(consulta);

  return (
    <article
      key={cardConsulta.chave}
      className={`relative flex min-h-0 flex-1 flex-col border p-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition ${
        autorizacaoConcluida
          ? "border-emerald-200 bg-emerald-50/55 opacity-75"
          : consulta.erroAutorizacao === true
          ? "border-red-300 bg-red-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 justify-end">
          <ConsultaFluxoStatusBadge
            visivel={statusBadgeVisivel}
            tokenInlineVisivel={tokenInlineVisivel}
            autorizacaoConcluida={autorizacaoConcluida}
            tokenEnviadoNoFluxo={tokenEnviadoNoFluxo}
            faltouConsulta={faltouConsulta}
            erroAutorizacao={consulta.erroAutorizacao === true}
            consultaAtendida={consultaAtendida}
            statusAgendamento={consulta.statusAgendamento}
            formatarStatus={formatarStatus}
          />
        </div>

        <ConsultaFluxoResumo
          cardConsulta={cardConsulta}
          consulta={consulta}
          tokenInlineVisivel={tokenInlineVisivel}
          obterFaixaHorariosConsultas={obterFaixaHorariosConsultas}
          formatarHora={formatarHora}
          localExibicao={localExibicao}
        />

        <ConsultaFluxoAcao
          consulta={consulta}
          autorizacaoConcluida={autorizacaoConcluida}
          processandoSenha={processandoSenha}
          tokenInlineVisivel={tokenInlineVisivel}
          podeSeguir={podeSeguir}
          faltouConsulta={faltouConsulta}
          consultaAtendida={consultaAtendida}
          deveProcurarRecepcao={deveProcurarRecepcao}
          tokenDigitado={tokenDigitado}
          reenviandoToken={reenviandoToken}
          validandoToken={validandoToken}
          reenvioDesabilitadoPorErro={reenvioDesabilitadoPorErro}
          tecladoTokenAberto={tecladoTokenAberto}
          segundosRestantesReenvio={segundosRestantesReenvio}
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
      </div>
    </article>
  );
};

export default BeneficiarioConsultaFluxoCard;
