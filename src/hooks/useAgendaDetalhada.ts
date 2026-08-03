import { useEffect, useState } from "react";
import { api } from "../config/configApi";
import type {
  AgendaEvento,
  DadosGuiaAutorizacao,
  UseAgendaDetalhadaProps,
} from "../types/agenda";
import { createAgendaDetalhadaShared } from "./useAgendaDetalhada.shared";
import { createAgendaDetalhadaStatus } from "./useAgendaDetalhada.status";
import { createAgendaDetalhadaAutorizacao } from "./useAgendaDetalhada.autorizacao";

export const useAgendaDetalhada = ({ location }: UseAgendaDetalhadaProps) => {
  const [guiasAutorizacao, setGuiasAutorizacao] = useState<
    Record<number, DadosGuiaAutorizacao>
  >(() => {
    try {
      const salvo = sessionStorage.getItem("guiasAutorizacaoAgenda");
      return salvo ? JSON.parse(salvo) : {};
    } catch {
      return {};
    }
  });
  const [profissional, setProfissional] = useState<string | undefined>();
  const [idProfissional, setIdProfissional] = useState<string | undefined>();
  const [modalRemarcarAberto, setModalRemarcarAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] =
    useState<AgendaEvento | null>(null);
  const [agenda, setAgenda] = useState<AgendaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [observacoesEditadas, setObservacoesEditadas] = useState<
    Record<number, string>
  >({});

  const {
    persistirDadosGuiaAutorizacao,
    obterDadosGuiaAutorizacao,
    encaminharSenhaPainelParaMedico,
    handleChangeObservacao,
    handleSalvarObservacao,
  } = createAgendaDetalhadaShared({
    guiasAutorizacao,
    setGuiasAutorizacao,
    observacoesEditadas,
    setObservacoesEditadas,
    setAgenda,
  });

  const {
    atualizarStatusEmLote,
    fetchAgenda,
    marcarComoCompareceu,
    marcarComoConfirmado,
    marcarComoAtendido,
    marcarComoNaoCompareceu,
    marcarComoHorarioLivre,
  } = createAgendaDetalhadaStatus({
    agenda,
    idProfissional,
    profissional,
    setLoading,
    setAgenda,
    setEventoSelecionado,
    setModalRemarcarAberto,
  });

  const { marcarAutorizacao } = createAgendaDetalhadaAutorizacao({
    agenda,
    fetchAgenda,
    atualizarStatusEmLote,
    persistirDadosGuiaAutorizacao,
    obterDadosGuiaAutorizacao,
    encaminharSenhaPainelParaMedico,
  });

  useEffect(() => {
    if (location.state?.profissional && location.state?.idProfissional) {
      setProfissional(location.state.profissional);
      setIdProfissional(location.state.idProfissional);
    } else {
      const dadosSalvos = sessionStorage.getItem("detalhesProfissional");
      if (dadosSalvos) {
        const { profissional, idProfissional } = JSON.parse(dadosSalvos);
        setProfissional(profissional);
        setIdProfissional(idProfissional);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const run = async () => {
      if (!idProfissional || !profissional) {
        setLoading(false);
        return;
      }
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await api.get("/sisclinic/agenda/filtrar", {
          params: { idProfissional, data: today },
        });
        const agendaFiltrada = res.data.filter(
          (item: AgendaEvento) =>
            item.profissional.nmProfissional === profissional,
        );
        setAgenda(agendaFiltrada);
      } catch (error: any) {
        console.error(
          "Erro ao carregar agenda detalhada",
          error?.response?.data || error?.message,
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profissional, idProfissional]);

  useEffect(() => {
    const iniciais = Object.fromEntries(
      agenda.map((i) => [i.idEvento, i.descricaoEvento ?? ""]),
    );
    setObservacoesEditadas(iniciais);
  }, [agenda]);

  return {
    profissional,
    idProfissional,
    modalRemarcarAberto,
    eventoSelecionado,
    agenda,
    loading,
    observacoesEditadas,
    setModalRemarcarAberto,
    setEventoSelecionado,
    setObservacoesEditadas,
    fetchAgenda,
    marcarComoAtendido,
    marcarComoCompareceu,
    marcarComoConfirmado,
    marcarComoNaoCompareceu,
    marcarComoHorarioLivre,
    marcarAutorizacao,
    handleChangeObservacao,
    handleSalvarObservacao,
  };
};
