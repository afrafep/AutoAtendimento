"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FaClipboardList, FaUserCircle, FaUserMd } from "react-icons/fa";
import type { AgendaEvento } from "../../types/agenda";
import { useAgendaDetalhada } from "../../hooks/useAgendaDetalhada";
import type { ConsultaAutoAtendimento } from "./autoatendimentoTypes";

interface ModalAutorizacaoProps {
  consulta: ConsultaAutoAtendimento;
  onClose: () => void;
  onAfterFlow: () => Promise<void>;
  iniciarAutomaticamente?: boolean;
  abrirTokenInlineAposEnvio?: boolean;
  criarEventoBaseDaConsulta: (
    consulta: ConsultaAutoAtendimento,
  ) => AgendaEvento;
  formatarData: (data?: string) => string;
  formatarHora: (hora?: string) => string;
}

const ModalAutorizacaoBeneficiario: React.FC<ModalAutorizacaoProps> = ({
  consulta,
  onClose,
  onAfterFlow,
  iniciarAutomaticamente = false,
  abrirTokenInlineAposEnvio = false,
  criarEventoBaseDaConsulta,
  formatarData,
  formatarHora,
}) => {
  const iniciouFluxoAutomaticoRef = useRef(false);
  const [etapa] = useState<"tipo" | "confirmacao">("confirmacao");

  const locationAgenda = useMemo(
    () => ({
      state: {
        profissional: consulta.profissionalNome,
        idProfissional: String(consulta.idProfissional || ""),
      },
    }),
    [consulta.idProfissional, consulta.profissionalNome],
  );

  const { agenda, loading, marcarAutorizacao } = useAgendaDetalhada({
    location: locationAgenda,
  } as any);

  const eventoBaseConsulta = useMemo(
    () => criarEventoBaseDaConsulta(consulta),
    [consulta, criarEventoBaseDaConsulta],
  );

  const eventoCompleto = useMemo(
    () =>
      agenda.find(
        (item: any) => Number(item.idEvento) === Number(consulta.idEvento),
      ),
    [agenda, consulta.idEvento],
  );

  const iniciarFluxoAgenda = async () => {
    if (!consulta.idProfissional) {
      await Swal.fire(
        "Atenção",
        "Não foi possível identificar o profissional desse atendimento.",
        "warning",
      );
      return;
    }

    const eventoSelecionado = eventoCompleto || eventoBaseConsulta;

    const eventoCompletoEncontrado = agenda.find(
      (item: any) => Number(item.idEvento) === Number(consulta.idEvento),
    );

    const eventoParaFluxoBase = eventoCompletoEncontrado || eventoSelecionado;
    const eventoParaFluxo = {
      ...eventoParaFluxoBase,
      ...eventoBaseConsulta,
      senhaPainel:
        consulta.senhaPainel ||
        eventoBaseConsulta.senhaPainel ||
        eventoParaFluxoBase?.senhaPainel ||
        null,
      prioridadePainel:
        consulta.prioridadePainel ||
        eventoBaseConsulta.prioridadePainel ||
        eventoParaFluxoBase?.prioridadePainel ||
        null,
      localidadePainel:
        consulta.localidadePainel ||
        eventoBaseConsulta.localidadePainel ||
        eventoParaFluxoBase?.localidadePainel ||
        null,
      profissional: {
        ...(eventoParaFluxoBase?.profissional || {}),
        ...(eventoBaseConsulta.profissional || {}),
      },
      paciente: eventoParaFluxoBase?.paciente || eventoBaseConsulta.paciente,
      idProfissionalRealizaProcedimento:
        consulta.idProfissionalRealizaProcedimento ||
        eventoBaseConsulta.idProfissionalRealizaProcedimento ||
        eventoParaFluxoBase?.idProfissionalRealizaProcedimento,
    };

    if (!eventoParaFluxo) {
      await Swal.fire(
        "Carregando dados",
        "Aguarde a agenda completa carregar antes de iniciar a autorização.",
        "info",
      );
      return;
    }

    onClose();

    try {
      await marcarAutorizacao(eventoParaFluxo, {
        pularEscolhaTipo: true,
        pularConfirmacaoInicial: true,
        abrirTokenDiretoAposEnvio:
          iniciarAutomaticamente && !abrirTokenInlineAposEnvio,
        usarFluxoTokenInline: abrirTokenInlineAposEnvio,
        tipoAutorizacao: "tiss-sadt",
      });
    } finally {
      await onAfterFlow();
    }
  };

  useEffect(() => {
    if (
      !iniciarAutomaticamente ||
      loading ||
      !eventoCompleto ||
      iniciouFluxoAutomaticoRef.current
    ) {
      return;
    }

    iniciouFluxoAutomaticoRef.current = true;
    void iniciarFluxoAgenda();
  }, [eventoCompleto, iniciarAutomaticamente, loading]);

  if (iniciarAutomaticamente) {
    return null;
  }

  if (etapa !== "confirmacao") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-[560px] rounded-2xl border border-slate-700 bg-[#1f2937] p-6 shadow-2xl shadow-black/50">
        <div className="mb-5 flex items-center gap-2.5 text-white">
          <div className="text-pink-300">
            <FaClipboardList size={28} />
          </div>
          <h2 className="text-[1.45rem] font-black tracking-tight">
            {"Autorização TISS SADT"}
          </h2>
        </div>

        <div className="mb-4 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-[1.15rem] text-white">
              <FaUserCircle />
            </div>
            <div>
              <h3 className="text-[1.12rem] font-black uppercase text-white">
                {consulta.pacienteNome}
              </h3>
              <div className="mt-1 text-[0.72rem] text-blue-200">
                {"Carteira: "}
                {consulta.nrCarteiraPlano || "Não informada"}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-600 bg-slate-800/55 p-4">
          <div className="mb-4 flex items-center gap-3 text-white">
            <FaUserMd className="text-cyan-300" size={20} />
            <h3 className="text-[1.02rem] font-bold">
              Detalhes do Profissional
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-700/60 p-3.5">
              <div className="text-[0.72rem] text-slate-300">Profissional</div>
              <div className="mt-1 text-[1.08rem] font-bold text-white">
                {consulta.profissionalNome}
              </div>
            </div>
            <div className="rounded-xl bg-slate-700/60 p-3.5">
              <div className="text-[0.72rem] text-slate-300">Data/Hora</div>
              <div className="mt-1 text-[1.08rem] font-bold text-white">
                {formatarData(consulta.dataInicio)}{" "}
                {formatarHora(consulta.horaInicio)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => void iniciarFluxoAgenda()}
            disabled={loading}
            className="rounded-xl bg-indigo-500 px-5 py-2.5 text-[0.82rem] font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Carregando agenda..." : "Iniciar Autorização"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-500 px-5 py-2.5 text-[0.82rem] font-bold text-white transition hover:bg-slate-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAutorizacaoBeneficiario;
