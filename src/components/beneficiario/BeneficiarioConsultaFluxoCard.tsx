import React from "react";
import AutorizacaoPreparandoCard from "./AutorizacaoPreparandoCard";
import TokenInlinePanel from "./TokenInlinePanel";
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
  vacinação: "TÉRREO",
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
}) => (
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
        {!compareceuConsulta ||
        tokenEnviadoNoFluxo ||
        autorizacaoConcluida ||
        faltouConsulta ? (
          <p
            className={`inline-flex items-center gap-2 rounded-full border text-center font-black uppercase tracking-[0.06em] shadow-[0_8px_14px_rgba(15,23,42,0.08)] ${
              tokenInlineVisivel
                ? "min-h-7 px-3 py-1 text-[0.75rem] md:text-[0.85rem]"
                : "min-h-9 px-4 py-1.5 text-[0.82rem] md:text-[0.96rem]"
            } ${
              faltouConsulta
                ? "border-red-200 bg-red-50 text-red-700"
                : consulta.erroAutorizacao === true
                ? "border-red-400 bg-red-100 text-red-700"
                : tokenEnviadoNoFluxo && !autorizacaoConcluida
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : autorizacaoConcluida
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-blue-200 bg-blue-50 text-[#00338d]"
            }`}
          >
            {!autorizacaoConcluida ? (
              <span
                aria-hidden="true"
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  faltouConsulta || consulta.erroAutorizacao === true
                    ? "bg-red-500"
                    : tokenEnviadoNoFluxo
                    ? "bg-amber-500"
                    : "bg-[#00338d]"
                }`}
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
            {faltouConsulta
              ? "Consulta não realizada"
              : consulta.erroAutorizacao === true
              ? "PROCURE A RECEPÇÃO"
              : tokenEnviadoNoFluxo && !autorizacaoConcluida
              ? "AGUARDANDO SEU TOKEN"
              : autorizacaoConcluida
              ? "Atendimento liberado"
              : formatarStatus(consulta.statusAgendamento)}
          </p>
        ) : null}
      </div>

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
          {resolverLocalExibicao(consulta)}
        </p>

        {consulta.erroAutorizacao === true &&
        consulta.mensagemErroAutorizacao ? (
          <p className="mt-1 max-w-[90%] break-words text-xs text-red-500">
            {consulta.mensagemErroAutorizacao}
          </p>
        ) : null}
      </div>

      {autorizacaoConcluida ? null : processandoSenha ? (
        <AutorizacaoPreparandoCard />
      ) : tokenInlineVisivel ? (
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
      ) : podeSeguir ? (
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
      ) : (
        <div
          className={`flex h-10 w-full shrink-0 items-center justify-center px-3 text-center text-[0.8rem] font-bold ${
            faltouConsulta
              ? "bg-red-50 text-red-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {faltouConsulta ? "Atendimento encerrado" : "Atendimento indisponível"}
        </div>
      )}
    </div>
  </article>
);

export default BeneficiarioConsultaFluxoCard;
