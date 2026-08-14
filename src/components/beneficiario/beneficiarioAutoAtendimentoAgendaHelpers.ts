"use client";

import type { MutableRefObject } from "react";
import { api } from "../../config/configApi";
import { inteliteSenhaService } from "../../services/inteliteSenhaService";
import { normalizarCpf } from "./autoatendimentoHelpers";
import type { ConsultaAutoAtendimento } from "./autoatendimentoTypes";
import type { LocalProfissionalDia } from "./autoatendimentoHelpers";

export const buscarLocaisProfissionaisPorData = (
  cacheRef: MutableRefObject<Record<string, Promise<LocalProfissionalDia[]>>>,
  data: string,
) => {
  if (!cacheRef.current[data]) {
    cacheRef.current[data] = api
      .get<LocalProfissionalDia[]>(
        `/sisclinic/local-atendimento-pessoas/profissionais/dia/${data}`,
      )
      .then((response) => response.data || [])
      .catch((error) => {
        delete cacheRef.current[data];
        throw error;
      });
  }

  return cacheRef.current[data];
};

export const obterPeriodoPorHora = (hora?: string) => {
  const horaNormalizada = String(hora || "").slice(0, 5);

  if (!horaNormalizada) {
    return "";
  }

  if (horaNormalizada < "12:00") {
    return "MANHA";
  }

  if (horaNormalizada < "18:00") {
    return "TARDE";
  }

  return "NOITE";
};

export const buscarLocalidadePainelDoProfissional = async (
  cacheRef: MutableRefObject<Record<string, Promise<LocalProfissionalDia[]>>>,
  consulta: ConsultaAutoAtendimento,
) => {
  if (!consulta.idProfissional) {
    return (
      String(consulta.localidadePainel || "Não informado").trim() || null
    );
  }

  try {
    const dataReferencia =
      String(consulta.dataInicio || "").slice(0, 10) ||
      new Date().toISOString().slice(0, 10);
    const locaisDoDia = await buscarLocaisProfissionaisPorData(
      cacheRef,
      dataReferencia,
    );
    const periodoConsulta = obterPeriodoPorHora(consulta.horaInicio);
    const localDoProfissional =
      locaisDoDia.find((local) => {
        const mesmoProfissional =
          String(local?.idProfissional || "") ===
          String(consulta.idProfissional || "");
        const statusAtivo =
          !local?.status || String(local.status).toUpperCase() === "ATIVO";
        const mesmaData =
          !local?.data || String(local.data).slice(0, 10) === dataReferencia;
        const mesmoPeriodo =
          !local?.periodo ||
          String(local.periodo).toUpperCase() === periodoConsulta;

        return mesmoProfissional && statusAtivo && mesmaData && mesmoPeriodo;
      }) ||
      locaisDoDia.find(
        (local) =>
          String(local?.idProfissional || "") ===
          String(consulta.idProfissional || ""),
      );

    const nomeLocal = String(localDoProfissional?.nomeLocal || "").trim();
    const numeroLocal = String(localDoProfissional?.nrLocal || "").trim();
    const localCompleto = [nomeLocal, numeroLocal].filter(Boolean).join(" - ");

    return (
      localCompleto ||
      String(consulta.localidadePainel || "Não informado").trim() ||
      null
    );
  } catch (error) {
    console.warn("Não foi possível consultar o local do profissional:", error);
    return String(consulta.localidadePainel || "Não informado").trim() || null;
  }
};

export const preencherLocaisDasConsultas = async (
  cacheRef: MutableRefObject<Record<string, Promise<LocalProfissionalDia[]>>>,
  consultasOriginais: ConsultaAutoAtendimento[],
) => {
  if (consultasOriginais.length === 0) {
    return consultasOriginais;
  }

  const consultasComLocal = await Promise.all(
    consultasOriginais.map(async (consulta) => {
      if (
        String(consulta.localidadePainel || "").trim() ||
        !consulta.idProfissional
      ) {
        return consulta;
      }

      const dataReferencia =
        String(consulta.dataInicio || "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10);

      try {
        const locaisDoDia = await buscarLocaisProfissionaisPorData(
          cacheRef,
          dataReferencia,
        );
        const periodoConsulta = obterPeriodoPorHora(consulta.horaInicio);
        const localDoProfissional =
          locaisDoDia.find((local) => {
            const mesmoProfissional =
              String(local?.idProfissional || "") ===
              String(consulta.idProfissional || "");
            const statusAtivo =
              !local?.status || String(local.status).toUpperCase() === "ATIVO";
            const mesmaData =
              !local?.data || String(local.data).slice(0, 10) === dataReferencia;
            const mesmoPeriodo =
              !local?.periodo ||
              String(local.periodo).toUpperCase() === periodoConsulta;

            return mesmoProfissional && statusAtivo && mesmaData && mesmoPeriodo;
          }) ||
          locaisDoDia.find(
            (local) =>
              String(local?.idProfissional || "") ===
              String(consulta.idProfissional || ""),
          );

        const nomeLocal = String(localDoProfissional?.nomeLocal || "").trim();
        const numeroLocal = String(localDoProfissional?.nrLocal || "").trim();
        const localCompleto = [nomeLocal, numeroLocal]
          .filter(Boolean)
          .join(" - ");

        if (!localCompleto) {
          return consulta;
        }

        return {
          ...consulta,
          localidadePainel: localCompleto,
        };
      } catch (error) {
        console.warn("Não foi possível carregar o local do profissional:", error);
        return consulta;
      }
    }),
  );

  return consultasComLocal;
};

export const obterIdTipoAtendimentoPainel = async (
  consulta: ConsultaAutoAtendimento,
) => {
  const tiposAtendimento = await inteliteSenhaService.buscarTiposAtendimento();

  if (!Array.isArray(tiposAtendimento) || tiposAtendimento.length === 0) {
    throw new Error("Nenhum tipo de atendimento Intelite foi encontrado.");
  }

  const prioridadeDesejada = String(
    consulta.prioridadePainel || consulta.categoria || "CONSULTA",
  )
    .trim()
    .toUpperCase();

  const tipoCompativel =
    tiposAtendimento.find((tipo) => {
      const nomeTipo = String(tipo.tipoAtendimento || "").trim().toUpperCase();
      const prefixoTipo = String(tipo.prefixo || "").trim().toUpperCase();

      return (
        nomeTipo === prioridadeDesejada || prefixoTipo === prioridadeDesejada
      );
    }) ||
    tiposAtendimento.find((tipo) =>
      String(tipo.tipoAtendimento || "")
        .trim()
        .toUpperCase()
        .includes("CONSULTA"),
    ) ||
    tiposAtendimento[0];

  const idTipoAtendimento = String(tipoCompativel?.id || "").trim();

  if (!idTipoAtendimento) {
    throw new Error("Tipo de atendimento Intelite inválido para emissão.");
  }

  return idTipoAtendimento;
};

export const emitirSenhaPainelAutomaticamente = async (
  consulta: ConsultaAutoAtendimento,
) => {
  const idTipoAtendimento = await obterIdTipoAtendimentoPainel(consulta);
  const resposta = await inteliteSenhaService.emitirSenha({
    idTipoAtendimento,
    nomePaciente: consulta.pacienteNome,
    telefone: normalizarCpf(consulta.celularContato || ""),
    codigo: String(consulta.idEvento),
  });

  const senhaGerada = String(resposta?.senhaEmitida || "").trim().toUpperCase();

  if (!senhaGerada) {
    throw new Error("A Intelite não retornou a senha emitida.");
  }

  return senhaGerada;
};
