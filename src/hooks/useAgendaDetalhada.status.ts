import Swal from "sweetalert2";
import { api } from "../config/configApi";
import { enviarProcedimentosDiretosLogicMed } from "../services/agendaDetalhada.logicmed";
import type { AgendaEvento } from "../types/agenda";
import { AUTH_DEFAULTS } from "./useAgendaDetalhada.shared";

interface StatusContext {
  agenda: AgendaEvento[];
  idProfissional?: string;
  profissional?: string;
  setLoading: any;
  setAgenda: any;
  setEventoSelecionado: any;
  setModalRemarcarAberto: any;
}

export const createAgendaDetalhadaStatus = ({
  agenda,
  idProfissional,
  profissional,
  setLoading,
  setAgenda,
  setEventoSelecionado,
  setModalRemarcarAberto,
}: StatusContext) => {
  const buildHorarioLivrePayload = (evento: AgendaEvento) => ({
    horario: String(evento.horaInicio || "").slice(0, 5),
    nomeEvento: "HORÁRIO LIVRE",
    descricaoEvento: "",
    dataInicio: evento.dataInicio,
    horaInicio: evento.horaInicio,
    horaFim: evento.horaFim,
    categoria: evento.categoria || "CONSULTA",
    statusAgendamento: "LIVRE",
    corEvento: "#e1e1e1",
    celularContato: "",
    nuCpf: "",
    cdPaciente: null,
    paciente: null,
    procedimentos: [],
    localAgendamento: evento.localAgendamento || "CENTRO_MEDICO",
    senhaPainel: "",
    prioridadePainel: "",
    localidadePainel: "",
    numeroGuiaGerado: null,
    numeroGuiaOperadora: null,
    profissionalSolicitante: null,
    nrConselhoProfSolicitante: "",
    conselhoProfSolicitante: null,
    ufConselhoProfSolicitante: null,
    ...AUTH_DEFAULTS,
  });

  const atualizarStatusEmLote = async (
    idEventoAlterado: number,
    novoStatus: string,
  ) => {
    try {
      // 1. Encontrar o evento que foi alterado
      const eventoAlterado = agenda.find(
        (e) => e.idEvento === idEventoAlterado,
      );
      if (!eventoAlterado) {
        console.error("Evento não encontrado para atualização em lote");
        return;
      }

      // CORREÇÃO: verificar se já está com status "ATENDIDO" e não permitir alteração
      const statusAtual = eventoAlterado.statusAgendamento;
      if (statusAtual === "ATENDIDO") {
        console.log("Evento já está como ATENDIDO - não será alterado");
        return;
      }

      // 2. Verificar se é um paciente válido (não é HORÁRIO LIVRE)
      if (
        !eventoAlterado.paciente ||
        eventoAlterado.nomeEvento === "HORÁRIO LIVRE"
      ) {
        console.log("Evento não é de paciente - atualização individual");
        // Atualizar apenas o evento individual
        await api.patch(`/sisclinic/agenda/${idEventoAlterado}`, {
          statusAgendamento: novoStatus,
        });
        return;
      }

      // 3. Identificar o paciente pelo CPF ou número da carteira
      const chavePaciente =
        eventoAlterado.paciente.nuCpf ||
        eventoAlterado.paciente.nrCarteiraPlano;
      if (!chavePaciente) {
        console.error(
          "Não foi possível identificar o paciente para atualização em lote",
        );
        // Atualizar apenas o evento individual
        await api.patch(`/sisclinic/agenda/${idEventoAlterado}`, {
          statusAgendamento: novoStatus,
        });
        return;
      }

      // 4. Encontrar todos os eventos do mesmo paciente na mesma data
      const eventosDoPaciente = agenda.filter((evento) => {
        if (!evento.paciente || evento.nomeEvento === "LIVRE") return false;

        const chaveAtual =
          evento.paciente.nuCpf || evento.paciente.nrCarteiraPlano;

        // CORREÇÃO: também verificar se o evento já está "ATENDIDO"
        if (evento.statusAgendamento === "ATENDIDO") {
          return false; // Não incluir eventos já atendidos
        }

        return (
          chaveAtual === chavePaciente &&
          evento.dataInicio === eventoAlterado.dataInicio
        );
      });
      console.log(
        `Encontrados ${eventosDoPaciente.length} eventos para o paciente ${eventoAlterado.paciente.nmPaciente}`,
      );

      // 5. Atualizar todos os eventos em lote
      const resultados = await Promise.all(
        eventosDoPaciente.map((evento) =>
          api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
            statusAgendamento: novoStatus,
          }),
        ),
      );

      console.log(
        `Status atualizado para ${resultados.length} eventos do paciente ${eventoAlterado.paciente.nmPaciente}`,
      );
    } catch (error) {
      console.error("Erro ao atualizar status em lote:", error);
      throw error;
    }
  };

  const fetchAgenda = async () => {
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
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Agenda atualizada com sucesso!",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#1e1e2f",
        color: "#ffffff",
        iconColor: "#4ade80",
      });
    } catch (error: any) {
      console.error("Erro ao carregar agenda detalhada", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoCompareceu = async (evento: AgendaEvento) => {
    const nome = evento?.paciente?.nmPaciente ?? "Paciente Desconhecido";
    const formatarNome = (s: string) =>
      s
        .toLowerCase()
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

    const nomeFormatado = formatarNome(nome);

    Swal.fire({
      title: "Marcar como 'Compareceu'?",
      text: `Deseja marcar ${nomeFormatado} como "Compareceu"?`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sim, marcar!",
      cancelButtonText: "Cancelar",
    }).then(async (confirmacao) => {
      if (!confirmacao.isConfirmed) return;
      try {
        // CORREÇÃO: usar a função de atualização em lote
        await atualizarStatusEmLote(
          evento.idEvento,
          "COMPARECEU", // MUDANÇA: string direta
        );

        await enviarProcedimentosDiretosLogicMed(evento);

        Swal.fire(
          "Inserido!",
          `${nomeFormatado} foi marcado como "Compareceu".`,
          "success",
        ).then(() => fetchAgenda());
      } catch (error) {
        console.error(error);
        Swal.fire("Erro!", "Não foi possível atualizar o status.", "error");
      }
    });
  };

  const marcarComoConfirmado = async (evento: AgendaEvento) => {
    const nome = evento?.paciente?.nmPaciente ?? "Paciente Desconhecido";
    const nomeFormatado = nome
      .toLowerCase()
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");

    Swal.fire({
      title: "Marcar como 'Confirmado'?",
      text: `Deseja confirmar o atendimento de ${nomeFormatado}?`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sim, confirmar!",
      cancelButtonText: "Cancelar",
    }).then(async (confirmacao) => {
      if (!confirmacao.isConfirmed) return;
      try {
        // CORREÇÃO: usar a função de atualização em lote
        await atualizarStatusEmLote(
          evento.idEvento,
          "CONFIRMADO", // MUDANÇA: string direta
        );

        Swal.fire(
          "Concluído!",
          `${nomeFormatado} foi marcado como "Confirmado".`,
          "success",
        ).then(() => fetchAgenda());
      } catch (error) {
        console.error(error);
        Swal.fire("Erro!", "Não foi possível atualizar o status.", "error");
      }
    });
  };

  const marcarComoAtendido = async (evento: AgendaEvento) => {
    const nome = evento?.paciente?.nmPaciente ?? "Paciente Desconhecido";
    const nomeFormatado = nome
      .toLowerCase()
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");

    Swal.fire({
      title: "Marcar como 'Atendido'?",
      text: `Deseja marcar como atendido ${nomeFormatado}?`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sim, confirmar!",
      cancelButtonText: "Cancelar",
    }).then(async (confirmacao) => {
      if (!confirmacao.isConfirmed) return;
      try {
        // CORREÇÃO: usar a função de atualização em lote
        await atualizarStatusEmLote(
          evento.idEvento,
          "ATENDIDO", // MUDANÇA: string direta
        );

        Swal.fire(
          "Concluído!",
          `${nomeFormatado} foi marcado como "Atendido".`,
          "success",
        ).then(() => fetchAgenda());
      } catch (error) {
        console.error(error);
        Swal.fire("Erro!", "Não foi possível atualizar o status.", "error");
      }
    });
  };

  const marcarComoNaoCompareceu = async (evento: AgendaEvento) => {
    const nome = evento?.paciente?.nmPaciente ?? "Paciente Desconhecido";
    const nomeFormatado = nome
      .toLowerCase()
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");

    Swal.fire({
      title: "Marcar como 'Faltou'?",
      text: `Deseja marcar ${nomeFormatado} como "Faltou"?`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sim, marcar!",
      cancelButtonText: "Cancelar",
    }).then(async (confirmacao) => {
      if (!confirmacao.isConfirmed) return;
      try {
        // CORREÇÃO: usar a função de atualização em lote
        await atualizarStatusEmLote(
          evento.idEvento,
          "FALTOU", // MUDANÇA: string direta
        );

        // CORREÇÃO: criar prontuário apenas para o evento principal
        // (não criar para todos os eventos em lote)
        const prontuarioData = {
          cdPaciente: evento.paciente?.cdPaciente,
          nuCpf: evento.paciente?.nuCpf,
          tipo: "NAO_COMPARECEU",
          idProfissional: evento.profissional?.idProfissional,
          dsEvolucao: "Paciente não compareceu ao atendimento",
          localEvolucao: "POLICLINICA",
          maisSaude: 0,
        };
        await api.post("/sisclinic/prontuarios", prontuarioData);

        Swal.fire(
          "Atualizado!",
          `${nomeFormatado} foi marcado como "Não Compareceu".`,
          "success",
        ).then(() => fetchAgenda());
      } catch (error) {
        console.error(error);
        Swal.fire(
          "Erro!",
          "Não foi possível marcar como 'Não Compareceu'.",
          "error",
        );
      }
    });
  };

  const marcarComoHorarioLivre = (evento: AgendaEvento) => {
    const nome = evento?.paciente?.nmPaciente ?? "Paciente";
    Swal.fire({
      title: "Desmarcar ou remarcar?",
      text: `Você deseja desmarcar a consulta de ${nome} ou remarcar para outro paciente?`,
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Remarcar(Outra pessoa)",
      denyButtonText: "Desmarcar(Agenda Livre)",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setEventoSelecionado(evento);
        setModalRemarcarAberto(true);
      } else if (result.isDenied) {
        try {
          const payload = buildHorarioLivrePayload(evento);
          await api.patch(`/sisclinic/agenda/${evento.idEvento}`, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          });

          setAgenda((prev: AgendaEvento[]) =>
            prev.map((item) =>
              item.idEvento === evento.idEvento
                ? {
                    ...item,
                    ...payload,
                    nomeEvento: "HORÁRIO LIVRE",
                    descricaoEvento: "",
                    statusAgendamento: "LIVRE",
                    corEvento: "#e1e1e1",
                    paciente: null,
                    celularContato: "",
                    nuCpf: "",
                    procedimentos: [],
                  }
                : item,
            ),
          );

          Swal.fire(
            "Sucesso!",
            "O horário foi liberado com sucesso.",
            "success",
          ).then(() => fetchAgenda());
        } catch (error) {
          console.error(error);
          Swal.fire("Erro!", "Não foi possível liberar o horário.", "error");
        }
      }
    });
  };

  return {
    atualizarStatusEmLote,
    fetchAgenda,
    marcarComoCompareceu,
    marcarComoConfirmado,
    marcarComoAtendido,
    marcarComoNaoCompareceu,
    marcarComoHorarioLivre,
  };
};
