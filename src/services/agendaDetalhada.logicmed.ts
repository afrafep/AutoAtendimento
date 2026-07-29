import { api } from "../config/configApi";
import { toast } from "react-toastify";

import type { AgendaEvento } from "../types/agenda";
import { buildLogicWorklistBody as buildLogicWorklistBodyHelper } from "../hooks/useAgendaDetalhada.helpers";

const PROCEDIMENTOS_LOGIC_MED_DIRETOS = new Set(["40901106"]);

export const normalizarCodigoProcedimentoLogic = (valor: any) =>
  String(valor ?? "").replace(/\D/g, "").trim();

const extrairProcedimentosParaLogic = (evento: any, itensParaPacsRaw: any[]) => {
  const procedimentosEvento = Array.isArray(evento?.procedimentos)
    ? evento.procedimentos
    : [];
  const procedimentosPacs = Array.isArray(itensParaPacsRaw)
    ? itensParaPacsRaw.map((item) => item?.procedimento || item)
    : [];

  return [...procedimentosEvento, ...procedimentosPacs];
};

export const possuiProcedimentoLogicMedDireto = (
  evento: any,
  itensParaPacsRaw: any[],
) =>
  extrairProcedimentosParaLogic(evento, itensParaPacsRaw).some((proc) =>
    PROCEDIMENTOS_LOGIC_MED_DIRETOS.has(
      normalizarCodigoProcedimentoLogic(proc?.cdProcedimento),
    ),
  );

export const corrigirTextoQuebrado = (valor: unknown) => {
  const texto = String(valor ?? "");
  if (!texto) return "";

  try {
    return decodeURIComponent(escape(texto));
  } catch {
    return texto;
  }
};

export const filtrarProcedimentosLogicMedDiretos = (procedimentos: any[]) =>
  (Array.isArray(procedimentos) ? procedimentos : []).filter((proc) =>
    PROCEDIMENTOS_LOGIC_MED_DIRETOS.has(
      normalizarCodigoProcedimentoLogic(proc?.cdProcedimento),
    ),
  );

export const normalizarCampoString = (valor: unknown) => {
  if (valor == null) return "";
  if (typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    return String(
      objeto.codigo ??
        objeto.sigla ??
        objeto.descricao ??
        objeto.nome ??
        objeto.value ??
        objeto.id ??
        "",
    ).trim();
  }

  return String(valor).trim();
};

export const normalizarCbos = (valor: unknown, fallback = "999999") => {
  const cbos = normalizarCampoString(valor).replace(/\D/g, "");
  return cbos || fallback;
};

export const extrairSolicitanteParaAutorizacao = (
  evento: AgendaEvento,
  profissionalExecutante: any,
) => {
  const solicitanteEvento = evento.profissionalSolicitante;

  const conselhoSolicitante =
    solicitanteEvento?.conselhoProfSolicitante?.codigo ||
    solicitanteEvento?.conselhoProfSolicitante?.sigla ||
    (typeof evento.conselhoProfSolicitante === "object"
      ? evento.conselhoProfSolicitante?.codigo ||
        evento.conselhoProfSolicitante?.sigla
      : evento.conselhoProfSolicitante) ||
    profissionalExecutante.cdConselho;

  const numeroConselhoSolicitante =
    solicitanteEvento?.nrConselhoProfSolicitante ||
    evento.nrConselhoProfSolicitante ||
    profissionalExecutante.nrConselho;

  const ufSolicitante =
    solicitanteEvento?.ufConselhoProfSolicitante?.codigo ||
    solicitanteEvento?.ufConselhoProfSolicitante?.sigla ||
    (typeof evento.ufConselhoProfSolicitante === "object"
      ? evento.ufConselhoProfSolicitante?.codigo ||
        evento.ufConselhoProfSolicitante?.sigla
      : evento.ufConselhoProfSolicitante) ||
    profissionalExecutante.ufConselho;

  return {
    nomeSolicitante: solicitanteEvento?.nomeProfissionalSolicitante || "",
    conselhoSolicitante,
    numeroConselhoSolicitante,
    ufSolicitante,
    cbosSolicitante: solicitanteEvento?.cbosSolicitante || "",
  };
};

export const extrairValorConselhoExecutante = (conselho: any) => {
  if (!conselho) return "";
  if (typeof conselho === "object") {
    return conselho.codigo || conselho.sigla || "";
  }

  return conselho;
};

export const extrairUfExecutante = (uf: any) => {
  if (!uf) return "";
  if (typeof uf === "object") {
    return uf.codigo || uf.sigla || "";
  }

  return uf;
};

export const enviarWorklistLogicMed = async (body: any) => {
  const resp = await fetch("/api/logicmed/worklist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  return { ok: resp.status === 201, status: resp.status, raw: text };
};

export const buscarDadosProfissionalReal = async (
  idProfissional: string | number,
) => {
  try {
    const response = await api.get(`/sisclinic/profissionais/${idProfissional}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do profissional real:", error);
    return null;
  }
};

export const enviarProcedimentosDiretosLogicMed = async (
  evento: AgendaEvento,
) => {
  const procedimentosDiretos = filtrarProcedimentosLogicMedDiretos(
    evento.procedimentos || [],
  );

  if (procedimentosDiretos.length === 0) {
    return false;
  }

  for (let index = 0; index < procedimentosDiretos.length; index++) {
    const procedimento = procedimentosDiretos[index];
    const worklistBody = await buildLogicWorklistBodyHelper(
      {
        ...evento,
        procedimentos: [procedimento],
      },
      0,
    );

    try {
      const respLogic = await enviarWorklistLogicMed(worklistBody);
      if (respLogic.ok) {
        toast.success(
          `Worklist criada para ${procedimento?.nmProcedimento || "procedimento"}.`,
        );
      } else {
        toast.warn(
          `LogicMed retornou ${respLogic.status} para ${
            procedimento?.nmProcedimento || "procedimento"
          }. Verifique logs.`,
        );
      }
    } catch (error) {
      console.error(
        `Falha ao enviar Worklist para LogicMed no procedimento ${
          procedimento?.nmProcedimento || ""
        }:`,
        error,
      );
      toast.error(
        `Falha ao enviar Worklist para ${
          procedimento?.nmProcedimento || "procedimento"
        }.`,
      );
    }
  }

  return true;
};
