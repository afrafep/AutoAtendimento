import { toast } from "react-toastify";
import { buildLogicWorklistBody as buildLogicWorklistBodyHelper } from "./useAgendaDetalhada.helpers";
import { possuiProcedimentoLogicMedDireto } from "../services/agendaDetalhada.logicmed";
import type { AgendaEvento } from "../types/agenda";

type ItemPacsRaw = {
  eventoOrigem?: AgendaEvento;
  procedimento?: any;
};

export const formatarDataAutorizacao = (dataString?: string) => {
  if (!dataString) return "N/A";
  const [ano, mes, dia] = dataString.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
};

export const formatarHoraAutorizacao = (horaString?: string) =>
  horaString?.slice(0, 5) || "N/A";

export const getEmojiPacienteAutorizacao = (flSexo?: string) => {
  switch ((flSexo || "").toUpperCase()) {
    case "F":
      return "&#128105;";
    case "M":
      return "&#128104;";
    default:
      return "&#128100;";
  }
};

const normalizarCpf = (cpf?: string | null) =>
  String(cpf || "")
    .replace(/\D/g, "")
    .trim();

const normalizarTexto = (valor?: string | null) =>
  String(valor || "").trim().toUpperCase();

export const ehUltrassomAutorizacao = (evt: AgendaEvento) => {
  const idEspecialidade = evt.profissional?.especialidade?.idEspecialidade;
  const dsEspecialidade = evt.profissional?.especialidade?.dsEspecialidade || "";

  return (
    String(idEspecialidade) === "170" ||
    dsEspecialidade
      .trim()
      .toUpperCase()
      .includes("MEDICO ULTRASSONOGRAFISTA")
  );
};

const obterIdExecutante = (evt: AgendaEvento) =>
  String(
    evt.idProfissionalRealizaProcedimento ||
      evt.profissional?.idProfissional ||
      "",
  );

const obterProcedimentosAgrupados = (eventos: AgendaEvento[]) => {
  const mapa = new Map<
    string,
    {
      cdProcedimento: string | number;
      nmProcedimento: string;
      quantidadeProcedimento?: number;
    }
  >();

  eventos.forEach((evt) => {
    (evt.procedimentos || []).forEach((proc) => {
      const chave = `${String(proc.cdProcedimento)}::${String(
        proc.nmProcedimento || "",
      ).trim()}`;
      const quantidadeAtual = Number(proc.quantidadeProcedimento) || 1;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          cdProcedimento: proc.cdProcedimento,
          nmProcedimento: proc.nmProcedimento,
          quantidadeProcedimento: quantidadeAtual,
        });
        return;
      }

      const existente = mapa.get(chave);
      if (!existente) {
        return;
      }

      mapa.set(chave, {
        ...existente,
        quantidadeProcedimento:
          (Number(existente.quantidadeProcedimento) || 1) + quantidadeAtual,
      });
    });
  });

  return Array.from(mapa.values());
};

export const prepararContextoAutorizacaoAgrupada = (
  agenda: AgendaEvento[],
  evento: AgendaEvento,
) => {
  const isUltrassom = ehUltrassomAutorizacao(evento);
  const cpfPaciente = normalizarCpf(evento.paciente?.nuCpf || evento.nuCpf);
  const dataEvento = normalizarTexto(evento.dataInicio);
  const executanteEvento = obterIdExecutante(evento);

  const eventosAgrupadosAutorizacao =
    isUltrassom && cpfPaciente
      ? agenda
          .filter((item) => {
            if (!ehUltrassomAutorizacao(item)) return false;
            if (normalizarCpf(item.paciente?.nuCpf || item.nuCpf) !== cpfPaciente) {
              return false;
            }
            if (normalizarTexto(item.dataInicio) !== dataEvento) {
              return false;
            }
            return obterIdExecutante(item) === executanteEvento;
          })
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      : [evento];

  const eventoBaseAutorizacao =
    eventosAgrupadosAutorizacao.find((item) => item.profissionalSolicitante) ||
    eventosAgrupadosAutorizacao[0] ||
    evento;

  const procedimentosAutorizacaoRaw = isUltrassom
    ? obterProcedimentosAgrupados(eventosAgrupadosAutorizacao)
    : evento.procedimentos || [];

  const itensParaPacsRaw = isUltrassom
    ? eventosAgrupadosAutorizacao.flatMap((item) =>
        (item.procedimentos || []).map((proc) => ({
          eventoOrigem: item,
          procedimento: proc,
        })),
      )
    : (evento.procedimentos || []).map((proc) => ({
        eventoOrigem: evento,
        procedimento: proc,
      }));

  const idProfissionalParaAutorizacaoBase =
    evento.idProfissionalRealizaProcedimento ||
    evento.profissional?.idProfissional;

  return {
    isUltrassom,
    eventoBaseAutorizacao,
    procedimentosAutorizacaoRaw,
    itensParaPacsRaw,
    idProfissionalParaAutorizacaoBase,
  };
};

const enviarWorklistLogic = async (body: any) => {
  console.group("[LOGIC PACS] POST Worklist");
  try {
    const resp = await fetch("/api/logicmed/worklist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    const ok = resp.status === 201;
    console.groupEnd();
    return { ok, status: resp.status, raw: text };
  } catch (err) {
    console.error("[LOGIC PACS] Erro na chamada:", err);
    console.groupEnd();
    throw err;
  }
};

export const enviarParaPacsAposAutorizacao = async ({
  evento,
  eventoBaseAutorizacao,
  itensParaPacsRaw,
  isUltrassom,
  origem,
}: {
  evento: AgendaEvento;
  eventoBaseAutorizacao: AgendaEvento;
  itensParaPacsRaw: ItemPacsRaw[];
  isUltrassom: boolean;
  origem: "APTOS" | "TISS SADT";
}) => {
  const PROFISSIONAL_ULTRA = 9960008;
  const PROFISSIONAL_ENDO_COLO = 6831735;
  const possuiProcedimentoLogicDireto = possuiProcedimentoLogicMedDireto(
    evento,
    itensParaPacsRaw,
  );

  const deveEnviarParaPACS =
    possuiProcedimentoLogicDireto ||
    isUltrassom ||
    evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ULTRA ||
    evento.idProfissionalRealizaProcedimento === String(PROFISSIONAL_ULTRA) ||
    evento.profissional?.idProfissional === PROFISSIONAL_ULTRA ||
    evento.profissional?.idProfissional === String(PROFISSIONAL_ULTRA) ||
    evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ENDO_COLO ||
    evento.idProfissionalRealizaProcedimento ===
      String(PROFISSIONAL_ENDO_COLO) ||
    evento.profissional?.idProfissional === PROFISSIONAL_ENDO_COLO ||
    evento.profissional?.idProfissional === String(PROFISSIONAL_ENDO_COLO);

  let tipoExame = "DESCONHECIDO";
  if (possuiProcedimentoLogicDireto) {
    tipoExame = "ECODOPPLERCARDIOGRAMA";
  } else if (
    isUltrassom ||
    evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ULTRA ||
    evento.idProfissionalRealizaProcedimento === String(PROFISSIONAL_ULTRA) ||
    evento.profissional?.idProfissional === PROFISSIONAL_ULTRA ||
    evento.profissional?.idProfissional === String(PROFISSIONAL_ULTRA)
  ) {
    tipoExame = "ULTRASSOM";
  } else if (
    evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ENDO_COLO ||
    evento.idProfissionalRealizaProcedimento ===
      String(PROFISSIONAL_ENDO_COLO) ||
    evento.profissional?.idProfissional === PROFISSIONAL_ENDO_COLO ||
    evento.profissional?.idProfissional === String(PROFISSIONAL_ENDO_COLO)
  ) {
    tipoExame = "ENDOSCOPIA/COLONOSCOPIA";
  }

  if (itensParaPacsRaw && itensParaPacsRaw.length > 0 && deveEnviarParaPACS) {
    console.group(
      `[LOGIC PACS] Preparando envio após autorização bem-sucedida - ${tipoExame} (${origem})`,
    );
    console.log(
      `Enviando para PACS - Procedimento de ${tipoExame} detectado`,
    );

    try {
      const eventoParaPacs = {
        ...eventoBaseAutorizacao,
        ...eventoBaseAutorizacao,
        idEvento: `${evento.idEvento}`,
        descricaoEvento:
          eventoBaseAutorizacao.descricaoEvento || evento.descricaoEvento || "",
        dataInicio: eventoBaseAutorizacao.dataInicio || evento.dataInicio,
        horaInicio:
          eventoBaseAutorizacao.horaInicio?.slice(0, 5) ||
          evento.horaInicio?.slice(0, 5) ||
          "00:00",
        cdPaciente:
          eventoBaseAutorizacao.paciente?.cdPaciente ||
          evento.paciente?.cdPaciente ||
          "",
        idProfissionalRealizaProcedimento:
          eventoBaseAutorizacao.idProfissionalRealizaProcedimento ||
          evento.idProfissionalRealizaProcedimento,
        paciente: {
          cdPaciente:
            eventoBaseAutorizacao.paciente?.cdPaciente ||
            evento.paciente?.cdPaciente ||
            "SEM_ID",
          nmPaciente:
            (eventoBaseAutorizacao.paciente?.nmPaciente ||
              evento.paciente?.nmPaciente ||
              "")?.replace(/\s-\s\[\d+\]\s-\s\d+\sanos/, "") ||
            "PACIENTE SEM NOME",
          dtNascimento:
            eventoBaseAutorizacao.paciente?.dtNascimento ||
            evento.paciente?.dtNascimento ||
            "",
          flSexo:
            eventoBaseAutorizacao.paciente?.flSexo ||
            evento.paciente?.flSexo ||
            "O",
          nmUfEndereco:
            eventoBaseAutorizacao.paciente?.nmUfEndereco ||
            evento.paciente?.nmUfEndereco ||
            "PB",
          nuCpf:
            eventoBaseAutorizacao.paciente?.nuCpf ||
            evento.paciente?.nuCpf ||
            "",
          nrCarteiraPlano:
            eventoBaseAutorizacao.paciente?.nrCarteiraPlano ||
            evento.paciente?.nrCarteiraPlano ||
            "",
        },
        profissional: {
          idProfissional:
            eventoBaseAutorizacao.profissional?.idProfissional ||
            evento.profissional?.idProfissional,
          nmProfissional:
            eventoBaseAutorizacao.profissional?.nmProfissional ||
            evento.profissional?.nmProfissional ||
            "",
          especialidade:
            eventoBaseAutorizacao.profissional?.especialidade ||
            evento.profissional?.especialidade,
          ufConselho:
            eventoBaseAutorizacao.profissional?.ufConselho ||
            evento.profissional?.ufConselho ||
            "PB",
          crmNumero:
            eventoBaseAutorizacao.profissional?.crmNumero ||
            evento.profissional?.crmNumero ||
            "",
        },
        profissionalSolicitante:
          eventoBaseAutorizacao.profissionalSolicitante ||
          evento.profissionalSolicitante ||
          null,
        nrConselhoProfSolicitante:
          eventoBaseAutorizacao.nrConselhoProfSolicitante ||
          evento.nrConselhoProfSolicitante ||
          "",
        conselhoProfSolicitante:
          eventoBaseAutorizacao.conselhoProfSolicitante ||
          evento.conselhoProfSolicitante ||
          null,
        ufConselhoProfSolicitante:
          eventoBaseAutorizacao.ufConselhoProfSolicitante ||
          evento.ufConselhoProfSolicitante ||
          null,
        procedimentos: itensParaPacsRaw,
      };

      for (let index = 0; index < itensParaPacsRaw.length; index++) {
        const itemPacs = itensParaPacsRaw[index];
        const procedimentoPacs = itemPacs?.procedimento || itemPacs;
        const eventoOrigemPacs =
          itemPacs?.eventoOrigem || eventoBaseAutorizacao || evento;
        const eventoParaPacsItem = {
          ...eventoParaPacs,
          ...eventoOrigemPacs,
          idEvento: `${eventoOrigemPacs?.idEvento || evento?.idEvento || ""}`,
          procedimentos: [procedimentoPacs],
        };
        const worklistBody = await buildLogicWorklistBodyHelper(
          eventoParaPacsItem,
          0,
        );
        try {
          const respLogic = await enviarWorklistLogic(worklistBody);
          if (respLogic.ok) {
            toast.success(
              `Worklist ${index + 1} criada para ${procedimentoPacs?.nmProcedimento}!`,
            );
          } else {
            toast.warn(
              `PACS retornou ${respLogic.status} para ${procedimentoPacs?.nmProcedimento}. Verifique logs.`,
            );
          }
        } catch (err) {
          console.error(
            `Falha ao enviar Worklist para PACS no procedimento ${procedimentoPacs?.nmProcedimento}:`,
            err,
          );
          toast.error(
            `Falha ao enviar Worklist para ${procedimentoPacs?.nmProcedimento} (ver console).`,
          );
        }

        if (index < itensParaPacsRaw.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Erro geral no envio para Logic PACS:", error);
      toast.error("Erro ao enviar para PACS, mas autorização foi concluída.");
    }
    console.groupEnd();
    return;
  }

  if (itensParaPacsRaw && itensParaPacsRaw.length > 0) {
    console.log(
      "Não é ultrassom nem endoscopia/colonoscopia - PACS não será enviado",
    );
  }
};
