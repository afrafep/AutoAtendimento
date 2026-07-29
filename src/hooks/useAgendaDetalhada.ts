import { useEffect, useRef, useState } from "react";
import { api } from "../config/configApi";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { TokenEnviar } from "../components/TokenEnviar";
import { TokenValidar } from "../components/TokenValidar";
import { inteliteSenhaService } from "../services/inteliteSenhaService";
import { buildLogicWorklistBody as buildLogicWorklistBodyHelper } from "./useAgendaDetalhada.helpers";
import {
  buscarDadosProfissionalReal,
  corrigirTextoQuebrado,
  enviarProcedimentosDiretosLogicMed,
  extrairSolicitanteParaAutorizacao,
  extrairUfExecutante,
  extrairValorConselhoExecutante,
  normalizarCbos,
  normalizarCampoString,
  possuiProcedimentoLogicMedDireto,
} from "../services/agendaDetalhada.logicmed";
import type {
  AgendaEvento,
  DadosGuiaAutorizacao,
  UseAgendaDetalhadaProps,
} from "../types/agenda";

const AUTH_DEFAULTS = {
  autorizado: false,
  senhaAutorizacao: "",
  tokenValidado: false,
  retorno: false,
};

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

  const persistirDadosGuiaAutorizacao = (
    idEvento: number,
    numeroGuiaGerado: string,
    numeroGuiaOperadora: number,
  ) => {
    if (!idEvento) return;

    setGuiasAutorizacao((prev) => {
      const proximo = {
        ...prev,
        [idEvento]: {
          numeroGuiaGerado: String(numeroGuiaGerado || ""),
          numeroGuiaOperadora: Number(numeroGuiaOperadora || 0),
        },
      };

      sessionStorage.setItem(
        "guiasAutorizacaoAgenda",
        JSON.stringify(proximo),
      );

      return proximo;
    });
  };

  const obterDadosGuiaAutorizacao = (
    evento: AgendaEvento,
  ): DadosGuiaAutorizacao => {
    const dadosPersistidos = guiasAutorizacao[evento.idEvento];

    return {
      numeroGuiaGerado:
        String(
          evento.numeroGuiaGerado ||
            dadosPersistidos?.numeroGuiaGerado ||
            "",
        ).trim(),
      numeroGuiaOperadora: Number(
        evento.numeroGuiaOperadora ??
          dadosPersistidos?.numeroGuiaOperadora ??
          0,
      ),
    };
  };

  const obterNumeroLocalAutoAtendimento = (evento: AgendaEvento) => {
    const origem = String(
      evento.localidadePainel || evento.localAgendamento || evento.local || "",
    ).trim();
    const numeros = origem.match(/\d+/g);
    return numeros?.length ? numeros[numeros.length - 1] : "01";
  };

  const obterIdTipoAtendimentoEncaminhamento = async (evento: AgendaEvento) => {
    const tiposAtendimento = await inteliteSenhaService.buscarTiposAtendimento();

    if (!Array.isArray(tiposAtendimento) || tiposAtendimento.length === 0) {
      throw new Error("Nenhum tipo de atendimento Intelite foi encontrado.");
    }

    const prioridadeDesejada = String(
      evento.prioridadePainel || evento.categoria || "CONSULTA",
    )
      .trim()
      .toUpperCase();

    const tipoCompativel =
      tiposAtendimento.find((tipo) => {
        const nomeTipo = String(tipo.tipoAtendimento || "").trim().toUpperCase();
        const prefixoTipo = String(tipo.prefixo || "").trim().toUpperCase();

        return nomeTipo === prioridadeDesejada || prefixoTipo === prioridadeDesejada;
      }) ||
      tiposAtendimento.find((tipo) =>
        String(tipo.tipoAtendimento || "").trim().toUpperCase().includes("CONSULTA"),
      ) ||
      tiposAtendimento[0];

    const idTipoAtendimento = String(tipoCompativel?.id || "").trim();

    if (!idTipoAtendimento) {
      throw new Error("Tipo de atendimento Intelite inválido para encaminhamento.");
    }

    return idTipoAtendimento;
  };

  const encaminharSenhaPainelParaMedico = async (evento: AgendaEvento) => {
    const senhaPainel = String(evento.senhaPainel || "")
      .trim()
      .toUpperCase();

    if (!senhaPainel) {
      return;
    }

    const idProfissionalEvento =
      evento.idProfissionalRealizaProcedimento || evento.profissional?.idProfissional;
    const idProfissionalEncaminhamento = String(idProfissionalEvento || "").trim();

    if (!idProfissionalEncaminhamento) {
      throw new Error("ID do profissional não encontrado para encaminhar a senha.");
    }

    const idTipoAtendimento = await obterIdTipoAtendimentoEncaminhamento(evento);

    await inteliteSenhaService.encaminharSenha({
      idTipoAtendimento,
      senha: senhaPainel,
      local: "AUTOATENDIMENTO",
      numeroLocal: obterNumeroLocalAutoAtendimento(evento),
      nomeProfissional: String(evento.profissional?.nmProfissional || "AUTOATENDIMENTO").trim(),
      idProfissional: idProfissionalEncaminhamento,
      nomePaciente: String(evento.paciente?.nmPaciente || evento.nomeEvento || "Paciente").trim(),
    });
  };

  // ===================== FUNÇÃO PARA ATUALIZAR STATUS EM LOTE =====================
  const obterProfissionalParaAutorizacao = async (
    idProfissional: string | number,
  ) => {
    const chave = String(idProfissional || "").trim();

    if (!chave) {
      throw new Error("ID do profissional não encontrado para autorização");
    }

    if (!profissionaisAutorizacaoCacheRef.current[chave]) {
      profissionaisAutorizacaoCacheRef.current[chave] = api
        .get(`/sisclinic/profissionais/${chave}`)
        .then((response) => response.data)
        .catch((error) => {
          delete profissionaisAutorizacaoCacheRef.current[chave];
          throw error;
        });
    }

    return profissionaisAutorizacaoCacheRef.current[chave];
  };
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
          const payload = {
            nomeEvento: "HORÁRIO LIVRE",
            descricaoEvento: " ",
            statusAgendamento: "LIVRE", // MUDANÇA: string direta
            cdPaciente: null,
            paciente: null,
            nuCpf: "",
            celularContato: "",
            protocolo_agendamento: null,
            procedimentos: [{ cdProcedimento: 0, nmProcedimento: "" }],
            localAgendamento: "CENTRO_MEDICO",
            corEvento: "#e1e1e1",
            ...AUTH_DEFAULTS,
          };
          await api.patch(`/sisclinic/agenda/${evento.idEvento}`, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          });
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
  // Função para buscar o nome do profissional que realiza o procedimento
  const getNomeProfissionalRealiza = async (
    idProfissional: string | number | undefined,
  ) => {
    if (!idProfissional) return null;

    try {
      const dadosProfissional =
        await buscarDadosProfissionalReal(idProfissional);
      if (dadosProfissional) {
        // Buscar o nome do profissional dinamicamente e converter para maiúsculo
        const nomeProfissional = dadosProfissional.nmProfissional || "";
        return nomeProfissional.toUpperCase();
      }
    } catch (error) {
      console.error("Erro ao buscar profissional realiza:", error);
    }

    return null;
  };

  const marcarAutorizacao = async (
    evento: AgendaEvento,
    opcoes?: {
      pularEscolhaTipo?: boolean;
      pularConfirmacaoInicial?: boolean;
      abrirTokenDiretoAposEnvio?: boolean;
      tipoAutorizacao?: "tiss-sadt" | "aptos";
    },
  ) => {
    const formatarData = (dataString?: string) => {
      if (!dataString) return "N/A";
      const [ano, mes, dia] = dataString.split("-").map(Number);
      return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    };

    const formatarHora = (horaString?: string) =>
      horaString?.slice(0, 5) || "N/A";

    const getEmojiPaciente = (flSexo?: string) => {
      switch ((flSexo || "").toUpperCase()) {
        case "F":
          return "&#128105;";
        case "M":
          return "&#128104;";
        default:
          return "&#128100;";
      }
    };

    // ===================== FUNÇÕES LOGIC PACS =====================
    const normalizarCpf = (cpf?: string | null) =>
      String(cpf || "")
        .replace(/\D/g, "")
        .trim();

    const normalizarTexto = (valor?: string | null) =>
      String(valor || "").trim().toUpperCase();

    const ehUltrassom = (evt: AgendaEvento) => {
      const idEspecialidade = evt.profissional?.especialidade?.idEspecialidade;
      const dsEspecialidade =
        evt.profissional?.especialidade?.dsEspecialidade || "";

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

    const isUltrassom = ehUltrassom(evento);
    const cpfPaciente = normalizarCpf(evento.paciente?.nuCpf || evento.nuCpf);
    const dataEvento = normalizarTexto(evento.dataInicio);
    const executanteEvento = obterIdExecutante(evento);

    const eventosAgrupadosAutorizacao =
      isUltrassom && cpfPaciente
        ? agenda
            .filter((item) => {
              if (!ehUltrassom(item)) return false;
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
    const profissionalAutorizacaoPromise = idProfissionalParaAutorizacaoBase
      ? buscarDadosProfissionalReal(idProfissionalParaAutorizacaoBase)
      : null;
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
    // ===================== FIM FUNÇÕES LOGIC PACS =====================

    const { paciente } = evento;
    if (!paciente) {
      await Swal.fire({
        title: "Dados Incompletos",
        text: "Paciente não encontrado.",
        icon: "error",
        background: "#1f2937",
        color: "#f9fafb",
      });
      return;
    }

    const nome = paciente.nmPaciente || "Paciente Desconhecido";
    const nrCarteiraPlano = paciente.nrCarteiraPlano || "";
    const emojiPaciente = getEmojiPaciente(paciente.flSexo);

    // VERIFICAR SE JÁ ESTÁ AUTORIZADO E COM TOKEN CONFIRMADO
    const jaAutorizadoComToken =
      evento.autorizado === true && evento.tokenValidado === true;
    // MODAL INICIAL COM DUAS OPCOES (QUANDO NAO ESTA COMPLETO)
    const opcaoSelecionada = opcoes?.pularEscolhaTipo
      ? opcoes?.tipoAutorizacao || "tiss-sadt"
      : (
          await Swal.fire({
            title: "Tipo de Autorização",
            html: `
  <div class="text-center space-y-6">
    <div class="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6 rounded-2xl border border-blue-500/30">
      <div class="flex items-center space-x-4 justify-center">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl">${emojiPaciente}</div>
        <div>
          <h3 class="font-bold text-white text-xl">${nome}</h3>
          <div class="mt-2">
            <span class="text-blue-300 text-sm">Carteira: ${nrCarteiraPlano || "Não informada"}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <button
        id="btn-tiss-sadt"
        class="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-2xl border border-blue-500/30 transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center space-y-2"
      >
        <div class="text-2xl">&#127973;</div>
        <div class="font-bold">Autorização TISS SADT</div>
        <div class="text-xs text-blue-200">Autorizar</div>
      </button>

      <button
        id="btn-aptos"
        class="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white p-4 rounded-2xl border border-green-500/30 transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center space-y-2"
      >
        <div class="text-2xl">&#128203;</div>
        <div class="font-bold">Direto pelo APTOS</div>
        <div class="text-xs text-green-200">Digite a senha do APTOS</div>
      </button>
    </div>
  </div>
  `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "Cancelar",
            background: "#1f2937",
            color: "#f9fafb",
            width: "600px",
            didOpen: () => {
              const btnTissSadt = document.getElementById("btn-tiss-sadt");
              const btnAptos = document.getElementById("btn-aptos");

              btnTissSadt?.addEventListener("click", () => {
                Swal.close({ isConfirmed: true, value: "tiss-sadt" });
              });

              btnAptos?.addEventListener("click", () => {
                Swal.close({ isConfirmed: true, value: "aptos" });
              });
            },
          })
        ).value;

    // Se cancelou o modal inicial
    if (!opcaoSelecionada) return;

// FLUXO PARA OUTROS APTOS (SENHA JÁ EXISTENTE)
    if (opcaoSelecionada === "aptos") {
      // VERIFICAR SE JÁ TEM SENHA DA GUIA (já está autorizado)
      const jaTemSenhaGuia =
        evento.autorizado === true && evento.senhaAutorizacao;

      if (jaTemSenhaGuia) {
        // FLUXO RÁPIDO - JÁ TEM SENHA, SÓ VALIDAR TOKEN
        const senhaGuia = evento.senhaAutorizacao!;
        const { numeroGuiaGerado, numeroGuiaOperadora } =
          obterDadosGuiaAutorizacao(evento);

        const { value: confirmarValidacaoToken } = await Swal.fire({
          title: "Validação de Token",
          html: `
        <div class="text-center space-y-5">
          <div class="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 p-5 text-left shadow-lg shadow-emerald-900/20">
            <div class="mb-4 flex items-center gap-3 text-white">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl text-white">&#128203;</div>
              <div>
                <h4 class="text-lg font-bold">Senha já registrada</h4>
                <p class="text-sm text-emerald-200">A autorização já foi criada para este atendimento.</p>
              </div>
            </div>
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between gap-4">
                <span class="text-emerald-200">Paciente</span>
                <span class="text-right font-semibold text-white">${nome}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-emerald-200">Senha da guia</span>
                <span class="font-mono text-base font-bold text-white">${senhaGuia}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-emerald-200">Status do token</span>
                <span class="inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-300">&#128339; Pendente</span>
              </div>
            </div>
          </div>
          <p class="text-sm text-slate-300">Deseja validar o token agora?</p>
        </div>
        `,
          showCancelButton: true,
          confirmButtonText: "Validar Token",
          cancelButtonText: "Voltar",
          confirmButtonColor: "#2563eb",
          background: "#1f2937",
          color: "#f9fafb",
          width: "460px",
        });

        if (!confirmarValidacaoToken) return;

        // Validar token diretamente
        await TokenValidar({
          nome,
          nrCarteiraPlano,
          senhaGuia,
          numeroGuiaGerado,
          numeroGuiaOperadora,
          tokenEnviado: false,
          onTokenValidado: async (_token: string, tokenValidado: boolean) => {
            if (tokenValidado) {
              try {
                // Atualizar tokenValidado em lote para todos os eventos do paciente
                await atualizarStatusEmLote(
                  evento.idEvento,
                  evento.statusAgendamento,
                );

                // Atualizar apenas o tokenValidado para o evento específico
                await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
                  tokenValidado: true,
                });

                await Swal.fire({
                  title: "Token Validado!",
                  html: `<div class="text-green-200 text-center">Token validado com sucesso e salvo no sistema!</div>`,
                  icon: "success",
                  background: "#1f2937",
                  color: "#f9fafb",
                  confirmButtonText: "Concluir",
                });
              } catch (error) {
                console.error("Erro ao salvar validação do token:", error);
                await Swal.fire({
                  title: "Aviso",
                  text: "Token validado, mas houve um erro ao salvar no sistema.",
                  icon: "warning",
                  background: "#1f2937",
                  color: "#f9fafb",
                });
              }
            }
          },
          onReenviarToken: async () => {
            return await TokenEnviar({
              nome,
              nrCarteiraPlano,
              senhaGuia,
              numeroGuiaOperadora,
              isReenvio: true,
              silencioso: true,
            });
          },
        });
        return;
      }

      // FLUXO NORMAL - DIGITAR SENHA DA GUIA (quando não tem senha ainda)
      const { value: senhaGuia } = await Swal.fire({
        title: "Digite a Senha da Guia",
        html: `
    <div class="text-left space-y-4">
      <div class="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-4 rounded-2xl border border-green-500/30">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-lg">${emojiPaciente}</div>
          <div>
            <h3 class="font-bold text-white">${nome}</h3>
            <p class="text-green-200 text-sm">Carteira: ${
              nrCarteiraPlano || "Não informada"
            }</p>
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <label class="text-white text-sm font-medium">Número da Guia APTOS:</label>
        <input 
          type="text" 
          id="senha-guia" 
          class="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Digite o número da guia que está no aptools..."
          autocomplete="off"
        >
      </div>
    </div>
    `,
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#16a34a",
        background: "#1f2937",
        color: "#f9fafb",
        width: "450px",
        preConfirm: () => {
          const senhaInput = document.getElementById(
            "senha-guia",
          ) as HTMLInputElement;
          const senha = senhaInput?.value.trim();

          if (!senha) {
            Swal.showValidationMessage("Por favor, digite a senha da guia");
            return false;
          }

          if (senha.length < 5) {
            Swal.showValidationMessage("Senha da guia muito curta");
            return false;
          }

          return senha;
        },
      });

      if (!senhaGuia) return;

      // CORREÇÃO: salvar senha da guia e marcar como compareceu
      try {
        const { numeroGuiaOperadora } = obterDadosGuiaAutorizacao(evento);

        // Atualizar autorização em lote para todos os eventos do paciente
        await atualizarStatusEmLote(
          evento.idEvento,
          "COMPARECEU", // MUDANÇA: string direta
        );
        // Atualizar autorizado e senha apenas para o evento específico
        await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
          autorizado: true,
          senhaAutorizacao: String(senhaGuia || numeroGuiaOperadora || ""),
        });

        try {
          await encaminharSenhaPainelParaMedico({
            ...evento,
            autorizado: true,
            senhaAutorizacao: String(senhaGuia || numeroGuiaOperadora || ""),
          });
        } catch (error) {
          console.error("Erro ao encaminhar senha do autoatendimento para o médico:", error);
          toast.warning("Autorização concluída, mas não foi possível encaminhar a senha ao médico.");
        }

        // ===================== INÍCIO DA CORREÇÃO =====================
        // INTEGRAÇÃO COM LOGIC PACS - ENVIO APÓS AUTORIZAÇÃO BEM-SUCEDIDA (APTOS)
        // CORREÇÃO: enviar para PACS se for ultrassom (9960008) ou endoscopia/colonoscopia (6831735)
        const PROFISSIONAL_ULTRA = 9960008;
        const PROFISSIONAL_ENDO_COLO = 6831735;
        const possuiProcedimentoLogicDireto = possuiProcedimentoLogicMedDireto(
          evento,
          itensParaPacsRaw,
        );

        const deveEnviarParaPACS =
          // Procedimentos configurados para envio direto ao LogicMed
          possuiProcedimentoLogicDireto ||
          // Verifica ULTRASSOM pela especialidade 170 ou pelos ids antigos
          isUltrassom ||
          evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ULTRA ||
          evento.idProfissionalRealizaProcedimento ===
            String(PROFISSIONAL_ULTRA) ||
          evento.profissional?.idProfissional === PROFISSIONAL_ULTRA ||
          evento.profissional?.idProfissional === String(PROFISSIONAL_ULTRA) ||
          // Verifica ENDOSCOPIA/COLONOSCOPIA
          evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ENDO_COLO ||
          evento.idProfissionalRealizaProcedimento ===
            String(PROFISSIONAL_ENDO_COLO) ||
          evento.profissional?.idProfissional === PROFISSIONAL_ENDO_COLO ||
          evento.profissional?.idProfissional ===
            String(PROFISSIONAL_ENDO_COLO);

        // Identificar qual tipo de exame para logging
        let tipoExame = "DESCONHECIDO";
        if (possuiProcedimentoLogicDireto) {
          tipoExame = "ECODOPPLERCARDIOGRAMA";
        } else if (
          isUltrassom ||
          evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ULTRA ||
          evento.idProfissionalRealizaProcedimento ===
            String(PROFISSIONAL_ULTRA) ||
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
        if (
          senhaGuia &&
          itensParaPacsRaw &&
          itensParaPacsRaw.length > 0 &&
          deveEnviarParaPACS
        ) {
          console.group(
            `[LOGIC PACS] Preparando envio após autorização bem-sucedida - ${tipoExame} (APTOS)`,
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
                eventoBaseAutorizacao.descricaoEvento ||
                evento.descricaoEvento ||
                "",
              dataInicio:
                eventoBaseAutorizacao.dataInicio || evento.dataInicio,
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

            // CORREÇÃO: enviar todos os procedimentos, um por um
            for (
              let index = 0;
              index < itensParaPacsRaw.length;
              index++
            ) {
              const itemPacs = itensParaPacsRaw[index];
              const procedimentoPacs =
                itemPacs?.procedimento || itemPacs;
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
                    `Worklist ${index + 1} criada para ${
                    procedimentoPacs?.nmProcedimento
                    }!`,
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

              // Pequena pausa entre os envios para não sobrecarregar o servidor
              if (index < itensParaPacsRaw.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }
          } catch (error) {
            console.error("Erro geral no envio para Logic PACS:", error);
            toast.error(
              "Erro ao enviar para PACS, mas autorização foi concluída.",
            );
          }
          console.groupEnd();
        } else if (
          senhaGuia &&
          itensParaPacsRaw &&
          itensParaPacsRaw.length > 0
        ) {
          console.log(
            "Não é ultrassom nem endoscopia/colonoscopia - PACS não será enviado",
          );
        }

        // Mostrar confirmação de sucesso
        await Swal.fire({
          title: "Autorização Concluída!",
          html: `
          <div class="text-center space-y-4">
            <div class="bg-gradient-to-br from-green-500/20 to-emerald-600/20 p-4 rounded-2xl border border-green-500/30">
              <h4 class="font-bold text-white text-lg mb-2">Paciente autorizado e compareceu</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-green-300">Paciente:</span>
                  <span class="text-white">${nome}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-green-300">Senha Guia:</span>
                  <span class="text-white font-mono font-bold">${senhaGuia}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-green-300">Status:</span>
                  <span class="text-orange-400 font-semibold">Compareceu</span>
                </div>
              </div>
            </div>
          </div>
        `,
          icon: "success",
          background: "#1f2937",
          color: "#f9fafb",
          confirmButtonText: "Concluir",
        });

        fetchAgenda();
      } catch (error: any) {
        console.error("Erro ao salvar senha da guia:", error);

        const errorMessage =
          error?.response?.data?.mensagemErro ||
          error?.response?.data?.message ||
          error?.message ||
          "Erro ao salvar senha da guia.";

        await Swal.fire({
          title: "Erro na Autorização",
          html: `
          <div class="text-center space-y-4">
            <div class="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/20 p-5">
              <p class="text-lg font-black uppercase tracking-[0.16em] text-red-200">
                PROCURE A RECEPÇÃO
              </p>
            </div>
          </div>
        `,
          icon: "error",
          background: "#1f2937",
          color: "#f9fafb",
          confirmButtonText: "OK",
        });
        return;
      }

      const { numeroGuiaOperadora } = obterDadosGuiaAutorizacao(evento);
      // Modal para validação do token (APÓS já ter marcado como compareceu)
      const { value: acaoToken } = await Swal.fire({
        title: "Validação de Token",
        html: `
    <div class="text-center space-y-5">
      <div class="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 p-5 text-left shadow-lg shadow-emerald-900/20">
        <div class="mb-4 flex items-center gap-3 text-white">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl text-white">&#9989;</div>
          <div>
            <h4 class="text-lg font-bold">Guia registrada</h4>
            <p class="text-sm text-emerald-200">Escolha a próxima ação para concluir a validação.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between gap-4">
            <span class="text-emerald-200">Paciente</span>
            <span class="text-right font-semibold text-white">${nome}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-emerald-200">Carteira</span>
            <span class="font-mono text-white">${nrCarteiraPlano || "N/A"}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-emerald-200">Número da guia</span>
            <span class="font-mono text-white">${numeroGuiaOperadora || "N/A"}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-emerald-200">Senha da guia</span>
            <span class="font-mono text-base font-bold text-white">${senhaGuia}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-emerald-200">Status do token</span>
            <span class="inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-300">&#128339; Pendente</span>
          </div>
        </div>
      </div>
      <p class="text-sm text-slate-300">O que deseja fazer agora?</p>
    </div>
    `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Validar Token",
        denyButtonText: "Apenas Finalizar",
        cancelButtonText: "Enviar Token",
        confirmButtonColor: "#2563eb",
        denyButtonColor: "#16a34a",
        cancelButtonColor: "#f59e0b",
        background: "#1f2937",
        color: "#f9fafb",
        width: "470px",
      });

      // Agora o fluxo continua igual ao TISS SADT
      if (acaoToken === false) {
        // Apenas finalizar - não fazer validação de token
        await Swal.fire({
          title: "Concluído!",
          text: "Senha da guia registrada com sucesso. Token permanece pendente.",
          icon: "success",
          background: "#1f2937",
          color: "#f9fafb",
          confirmButtonText: "OK",
        });
        return;
      }

      if (acaoToken === true) {
        // Validar token - APENAS marca tokenValidado: true, não altera status
        await TokenValidar({
          nome,
          nrCarteiraPlano,
          senhaGuia,
          numeroGuiaOperadora,
          tokenEnviado: false,
          onTokenValidado: async (_token: string, tokenValidado: boolean) => {
            if (tokenValidado) {
              try {
                await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
                  tokenValidado: true,
                });
                await Swal.fire({
                  title: "Token Validado!",
                  html: `<div class="text-green-200 text-center">Token validado com sucesso e salvo no sistema!</div>`,
                  icon: "success",
                  background: "#1f2937",
                  color: "#f9fafb",
                  confirmButtonText: "Concluir",
                });
              } catch (error) {
                console.error("Erro ao salvar validação do token:", error);
                await Swal.fire({
                  title: "Aviso",
                  text: "Token validado, mas houve um erro ao salvar no sistema.",
                  icon: "warning",
                  background: "#1f2937",
                  color: "#f9fafb",
                });
              }
            }
          },
          onReenviarToken: async () => {
            return await TokenEnviar({
              nome,
              nrCarteiraPlano,
              senhaGuia,
              isReenvio: true,
              silencioso: true,
            });
          },
        });
        return;
      }

      // Botão "Enviar Token" (cancel button) - apenas envia token e fecha
      if (acaoToken === undefined) {
        await TokenEnviar({
          nome,
          nrCarteiraPlano,
          senhaGuia,
          isReenvio: false,
        });

        // Modal simplificado após enviar token
        await Swal.fire({
          title: "Token Enviado!",
          html: `
        <div class="text-center space-y-4">
          <div class="bg-gradient-to-br from-green-500/20 to-emerald-600/20 p-4 rounded-2xl border border-green-500/30">
            <h4 class="font-bold text-white text-lg mb-2">Token enviado com sucesso</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-green-300">Paciente:</span>
                <span class="text-white">${nome}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-green-300">Senha Guia:</span>
                <span class="text-white font-mono font-bold">${senhaGuia}</span>
              </div>
            </div>
          </div>
          <p class="text-gray-300">O token foi enviado para o paciente. Você pode validá-lo posteriormente.</p>
        </div>
        `,
          icon: "success",
          confirmButtonText: "Concluir",
          background: "#1f2937",
          color: "#f9fafb",
          width: "450px",
        });
      }
      return;
    }

    // FLUXO NORMAL TISS SADT
    if (evento.autorizado === true && evento.senhaAutorizacao != null) {
      const senhaGuia = evento.senhaAutorizacao;
      const { numeroGuiaGerado, numeroGuiaOperadora } =
        obterDadosGuiaAutorizacao(evento);
      await TokenValidar({
        nome,
        nrCarteiraPlano,
        senhaGuia,
        numeroGuiaGerado,
        numeroGuiaOperadora,
        tokenEnviado: true,
        onTokenValidado: async (_token: string, tokenValidado: boolean) => {
          if (tokenValidado) {
            try {
                  // CORREÇÃO: marcar como compareceu ao validar o token
              // Atualizar status em lote para todos os eventos do paciente
              await atualizarStatusEmLote(evento.idEvento, "COMPARECEU");

              await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
                tokenValidado: true,
              });

              await Swal.fire({
                title: "Token Validado!",
                html: `<div class="text-green-200 text-center">Token validado com sucesso e status atualizado para "Compareceu"!</div>`,
                icon: "success",
                background: "#1f2937",
                color: "#f9fafb",
                confirmButtonText: "Concluir",
              });

                  // Atualizar a agenda após a mudança
              fetchAgenda();
            } catch (error) {
              console.error("Erro ao salvar validação do token:", error);
              await Swal.fire({
                title: "Aviso",
                text: "Token validado, mas houve um erro ao salvar no sistema.",
                icon: "warning",
                background: "#1f2937",
                color: "#f9fafb",
              });
            }
          } else {
            await Swal.fire({
              title: "Token Validado!",
              html: `<div class="text-green-200 text-center">Token validado com sucesso!</div>`,
              icon: "success",
              background: "#1f2937",
              color: "#f9fafb",
              confirmButtonText: "Concluir",
            });
          }
        },
        onReenviarToken: async () => {
            return await TokenEnviar({
            nome,
            nrCarteiraPlano,
            senhaGuia,
            numeroGuiaOperadora,
            isReenvio: true,
              silencioso: true,
            });
        },
      });
      return;
    }

    let confirmacaoInicial = true;

    if (!opcoes?.pularConfirmacaoInicial) {
      const resultadoConfirmacao = await Swal.fire({
        title: "Autorização TISS SADT",
        html: `
  <div class="text-left space-y-4">
    <div class="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-4 rounded-2xl border border-blue-500/30">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">${emojiPaciente}</div>
        <div>
          <h3 class="font-bold text-white text-lg">${nome}</h3>
          <div class="flex flex-wrap gap-4 mt-1">
            <div class="flex items-center space-x-1">
              <span class="text-blue-300">&#128179;</span>
              <span class="text-blue-200 text-sm">Carteira: ${
                nrCarteiraPlano || "Não informada"
              }</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-2xl border border-gray-700">
      <h4 class="font-semibold text-white mb-3 flex items-center">Detalhes do Profissional</h4>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="p-2 bg-gray-700/50 rounded-lg">
          <p class="text-gray-400 text-xs">Profissional</p>
          <p class="text-white font-medium">${
            evento.profissional?.nmProfissional || "N/A"
          }</p>
        </div>
        <div class="p-2 bg-gray-700/50 rounded-lg">
          <p class="text-gray-400 text-xs">Data/Hora</p>
          <p class="text-white font-medium">${formatarData(
            evento.dataInicio,
          )} ${formatarHora(evento.horaInicio)}</p>
        </div>
      </div>
    </div>
  </div>
`,
        showCancelButton: true,
        confirmButtonText: "Iniciar Autorização",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#2563eb",
        background: "#1f2937",
        color: "#f9fafb",
        width: "500px",
      });

      confirmacaoInicial = !!resultadoConfirmacao.value;
    }

    if (!confirmacaoInicial) return;

    let progress = 0;
    Swal.fire({
      title: "Processando Autorização",
      html: `
  <div class="space-y-6">
    <div class="relative">
      <div class="w-full bg-gray-700 rounded-full h-3">
        <div id="progress-bar" class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
      </div>
      <div class="absolute -top-8 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
        <span id="progress-percent">${Math.round(progress)}%</span>
      </div>
    </div>
    <p id="progress-text" class="text-gray-300 text-center">Iniciando comunicação com TISS...</p>
    <div class="flex justify-center">
      <div class="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  </div>
`,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: "#1f2937",
      color: "#f9fafb",
      didOpen: () => {
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 90) progress = 90;
          const progressBar = document.getElementById("progress-bar");
          const progressPercent = document.getElementById("progress-percent");
          if (progressBar)
            (progressBar as HTMLElement).style.width = `${progress}%`;
          if (progressPercent)
            (progressPercent as HTMLElement).textContent = `${Math.round(
              progress,
            )}%`;
        }, 600);
        (Swal.getPopup() as any).progressInterval = interval;
      },
    });

    try {
      // USAR OS PROCEDIMENTOS AGRUPADOS DO ULTRASSOM QUANDO APLICÁVEL
      const procedimentosValidos = (procedimentosAutorizacaoRaw || [])
        .map((proc: any) => ({
          quantidadeSolicitada: Number(proc?.quantidadeProcedimento) || 1,
          codigoProcedimento: String(proc?.cdProcedimento ?? "").trim(),
          descricaoProcedimento: String(proc?.nmProcedimento ?? "").trim(),
          quantidadeProcedimento: Number(proc?.quantidadeProcedimento) || 1,
        }))
        .filter((proc) => proc.descricaoProcedimento.length > 0);

      const procedimentosPayload =
        procedimentosValidos.length > 0
          ? procedimentosValidos
          : [
              {
                quantidadeSolicitada: 1,
                codigoProcedimento: "10101012",
                descricaoProcedimento: "CONSULTA EM CONSULTORIO",
                quantidadeProcedimento: 1,
              },
            ];

      // CORREÇÃO PARA ULTRASSOM: sempre usar idProfissionalRealizaProcedimento quando disponível
      const idProfissionalParaAutorizacao = idProfissionalParaAutorizacaoBase;

      if (!idProfissionalParaAutorizacao) {
        throw new Error("ID do profissional não encontrado para autorização");
      }
      const profissionalData =
        (await profissionalAutorizacaoPromise) ||
        (await buscarDadosProfissionalReal(idProfissionalParaAutorizacao));

      if (!profissionalData) {
        throw new Error(
          "Não foi possível carregar os dados do profissional para autorização",
        );
      }
      const solicitanteData = extrairSolicitanteParaAutorizacao(
        eventoBaseAutorizacao,
        profissionalData,
      );
      const conselhoExecutante = extrairValorConselhoExecutante(
        profissionalData.cdConselho,
      );
      const ufExecutante = extrairUfExecutante(profissionalData.ufConselho);

      const payloadTissSadt = {
        idEvento: evento.idEvento,
        cdPaciente: paciente.cdPaciente,
        nuCpf: normalizarCampoString(paciente.nuCpf),
        numeroCarteira: normalizarCampoString(nrCarteiraPlano),
        cnpjContratado: normalizarCampoString(profissionalData.autorizacaoCpfCnpj),
        idProfissional: idProfissionalParaAutorizacao,
        conselhoProfissionalSolicitante: normalizarCampoString(
          solicitanteData.conselhoSolicitante,
        ),
        numeroConselhoProfissionalSolicitante: normalizarCampoString(
          solicitanteData.numeroConselhoSolicitante,
        ),
        ufConselhoSolicitante: normalizarCampoString(
          solicitanteData.ufSolicitante,
        ),
        cbosSolicitante: normalizarCbos(
          solicitanteData.cbosSolicitante || profissionalData.cbos,
        ),
        procedimentos: procedimentosPayload,
        ExecutanteCodigonaOperadora: normalizarCampoString(
          profissionalData.autorizacaoCpfCnpj,
        ),
        ExecutanteCnes: normalizarCampoString(
          profissionalData.autorizacaoCnes || "0",
        ),
        nuCpfProfissionalExecutante: normalizarCampoString(profissionalData.cpf),
        nmProfissionalExecutante: normalizarCampoString(
          profissionalData.nmProfissional,
        ),
        cdConselhoProfissionalExecutante: normalizarCampoString(
          conselhoExecutante,
        ),
        nuConselhoProfissionalExecutante: normalizarCampoString(
          profissionalData.nrConselho,
        ),
        ufConselhoProfissionalExecutante: normalizarCampoString(ufExecutante),
        cbosProfissionalExecutante: normalizarCbos(profissionalData.cbos),
      };

      const responseTiss = await api.post(
        "/sisclinic/tiss/sadt/enviar",
        payloadTissSadt,
      );

      // CORREÇÃO: verificar se a requisição foi bem-sucedida, mas a autorização falhou
      if (responseTiss.data?.sucesso === false) {
        const errorMessage =
          responseTiss.data?.mensagemErro ||
          "Autorização negada pela operadora";
          "Autorização negada pela operadora";
        const decodedErrorMessage = corrigirTextoQuebrado(errorMessage);

        throw new Error(decodedErrorMessage);
      }

      const senhaGuia = responseTiss.data?.senhaGuia;
      const numeroGuiaGerado = responseTiss.data?.numeroGuiaGerado || "";
      const numeroGuiaOperadora = Number(responseTiss.data?.numeroGuiaOperadora || 0);
      if (!senhaGuia) {
        const errorMessage =
          responseTiss.data?.mensagemErro ||
          "Senha guia não encontrada na resposta";
          "Senha guia não encontrada na resposta";
      }

      // CORREÇÃO: salvar senha da guia e marcar como compareceu no TISS SADT
      // Atualizar status em lote para todos os eventos do paciente
      await atualizarStatusEmLote(
        evento.idEvento,
        "COMPARECEU", // MUDANÇA: string direta
      );

      // Atualizar autorizado e senha apenas para o evento específico
      await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
        autorizado: true,
        senhaAutorizacao: String(numeroGuiaOperadora || ""),
      });

      void encaminharSenhaPainelParaMedico({
        ...evento,
        autorizado: true,
        senhaAutorizacao: String(numeroGuiaOperadora || ""),
      }).catch((error) => {
        console.error(
          "Erro ao encaminhar senha do autoatendimento para o médico:",
          error,
        );
        toast.warning(
          "Autorização concluída, mas não foi possível encaminhar a senha ao médico.",
        );
      });

      persistirDadosGuiaAutorizacao(
        evento.idEvento,
        numeroGuiaGerado,
        numeroGuiaOperadora,
      );

      await TokenEnviar({
        nome,
        nrCarteiraPlano,
        senhaGuia,
        numeroGuiaGerado,
        numeroGuiaOperadora,
        isReenvio: false,
      });

      void (async () => {
        // ===================== INÍCIO DA CORREÇÃO =====================
      // INTEGRAÇÃO COM LOGIC PACS - ENVIO APÓS AUTORIZAÇÃO BEM-SUCEDIDA
      // CORREÇÃO: enviar para PACS se for ultrassom (9960008) ou endoscopia/colonoscopia (6831735)
      const PROFISSIONAL_ULTRA = 9960008;
      const PROFISSIONAL_ENDO_COLO = 6831735;
      const possuiProcedimentoLogicDireto = possuiProcedimentoLogicMedDireto(
        evento,
        itensParaPacsRaw,
      );

      const deveEnviarParaPACS =
        // Procedimentos configurados para envio direto ao LogicMed
        possuiProcedimentoLogicDireto ||
        // Verifica ULTRASSOM pela especialidade 170 ou pelos ids antigos
        isUltrassom ||
        evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ULTRA ||
        evento.idProfissionalRealizaProcedimento ===
          String(PROFISSIONAL_ULTRA) ||
        evento.profissional?.idProfissional === PROFISSIONAL_ULTRA ||
        evento.profissional?.idProfissional === String(PROFISSIONAL_ULTRA) ||
        // Verifica ENDOSCOPIA/COLONOSCOPIA
        evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ENDO_COLO ||
        evento.idProfissionalRealizaProcedimento ===
          String(PROFISSIONAL_ENDO_COLO) ||
        evento.profissional?.idProfissional === PROFISSIONAL_ENDO_COLO ||
        evento.profissional?.idProfissional === String(PROFISSIONAL_ENDO_COLO);

      // Identificar qual tipo de exame para logging
      let tipoExame = "DESCONHECIDO";
      if (possuiProcedimentoLogicDireto) {
        tipoExame = "ECODOPPLERCARDIOGRAMA";
      } else if (
        isUltrassom ||
        evento.idProfissionalRealizaProcedimento === PROFISSIONAL_ULTRA ||
        evento.idProfissionalRealizaProcedimento ===
          String(PROFISSIONAL_ULTRA) ||
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

      if (
        senhaGuia &&
        itensParaPacsRaw &&
        itensParaPacsRaw.length > 0 &&
        deveEnviarParaPACS
      ) {
        console.group(
          `[LOGIC PACS] Preparando envio após autorização bem-sucedida - ${tipoExame}`,
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

          // CORREÇÃO: enviar todos os procedimentos, um por um
          for (
            let index = 0;
            index < itensParaPacsRaw.length;
            index++
          ) {
            const itemPacs = itensParaPacsRaw[index];
            const procedimentoPacs =
              itemPacs?.procedimento || itemPacs;
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
                  `Worklist ${index + 1} criada para ${
                    procedimentoPacs?.nmProcedimento
                  }!`,
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

            // Pequena pausa entre os envios para não sobrecarregar o servidor
            if (index < itensParaPacsRaw.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        } catch (error) {
          console.error("Erro geral no envio para Logic PACS:", error);
          toast.error(
            "Erro ao enviar para PACS, mas autorização foi concluída.",
          );
        }
      } else if (
        senhaGuia &&
        itensParaPacsRaw &&
        itensParaPacsRaw.length > 0
      ) {
        console.log(
          "Não é ultrassom nem endoscopia/colonoscopia - PACS não será enviado",
        );
      }
      // ===================== FIM DA CORREÇÃO =====================
      })().catch((error) => {
        console.error("Erro assíncrono no envio para Logic PACS:", error);
      });

      Swal.close();
      let tokenEnviado = true;

      const validarTokenDiretamente = async () => {
        await TokenValidar({
          nome,
          nrCarteiraPlano,
          senhaGuia,
          numeroGuiaGerado,
          numeroGuiaOperadora,
          tokenEnviado,
          onTokenValidado: async (_token: string, tokenValidado: boolean) => {
            if (tokenValidado) {
              try {
                await atualizarStatusEmLote(evento.idEvento, "COMPARECEU");

                await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
                  tokenValidado: true,
                });

                await Swal.fire({
                  title: "Token Validado!",
                  html: `<div class="text-green-200 text-center">Token validado com sucesso e status atualizado para "Compareceu"!</div>`,
                  icon: "success",
                  background: "#1f2937",
                  color: "#f9fafb",
                  confirmButtonText: "Concluir",
                });

                fetchAgenda();
              } catch (error) {
                console.error("Erro ao salvar validação do token:", error);
                await Swal.fire({
                  title: "Aviso",
                  text: "Token validado, mas houve um erro ao salvar no sistema.",
                  icon: "warning",
                  background: "#1f2937",
                  color: "#f9fafb",
                });
              }
            } else {
              await Swal.fire({
                title: "Token Validado!",
                html: `<div class="text-green-200 text-center">Token validado com sucesso!</div>`,
                icon: "success",
                background: "#1f2937",
                color: "#f9fafb",
                confirmButtonText: "Concluir",
              });
            }
          },
          onReenviarToken: async () => {
            return await TokenEnviar({
              nome,
              nrCarteiraPlano,
              senhaGuia,
              numeroGuiaGerado,
              numeroGuiaOperadora,
              isReenvio: true,
              silencioso: true,
            });
            tokenEnviado = true;
          },
        });
      };

      if (opcoes?.abrirTokenDiretoAposEnvio) {
        await validarTokenDiretamente();
        return;
      }

      while (true) {
        const { value: acao, isDismissed } = await Swal.fire({
          title: "Autorização Concluída!",
          html: `
      <div class="text-left space-y-4">
        <div class="bg-gradient-to-br from-green-500/20 to-emerald-600/20 p-4 rounded-2xl border border-green-500/30">
          <h4 class="font-bold text-white text-lg mb-3">&#128203; Dados da Guia</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-green-300">Paciente:</span>
              <span class="text-white">${nome}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-300">Senha Guia:</span>
              <span class="text-white font-mono font-bold">${senhaGuia}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-300">Status Token:</span>
              <span class="${
                tokenEnviado ? "text-green-400" : "text-yellow-400"
              } font-semibold">
                ${tokenEnviado ? "Enviado" : "Pendente"}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-300">Procedimentos:</span>
              <span class="text-white">${
                procedimentosPayload.length > 0
                  ? procedimentosPayload
                      .map((p) => p.descricaoProcedimento)
                      .join(", ")
                  : "Nenhum procedimento"
              }</span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-300">Profissional Executante:</span>
              <span class="text-white">${profissionalData.nmProfissional}</span>
          <p class="text-cyan-200 text-sm text-center">Token já enviado! Digite o código recebido no app</p>
          </div>
        </div>
        <div class="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
          <p class="text-cyan-200 text-sm text-center">Token já enviado! Digite o código recebido no app</p>
        </div>
      </div>
    `,
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: "Reenviar Token",
          denyButtonText: "Validar Token",
          cancelButtonText: "Finalizar",
          confirmButtonColor: "#f59e0b",
          denyButtonColor: "#2563eb",
          cancelButtonColor: "#16a34a",
          background: "#1f2937",
          color: "#f9fafb",
          width: "450px",
        });

        if (isDismissed) break;

        if (acao === true) {
          await TokenEnviar({
            nome,
            nrCarteiraPlano,
            senhaGuia,
            numeroGuiaGerado,
            numeroGuiaOperadora,
            isReenvio: true,
          });
          tokenEnviado = true;
        } else if (acao === false) {
          const result = await TokenValidar({
            nome,
            nrCarteiraPlano,
            senhaGuia,
            numeroGuiaGerado,
            numeroGuiaOperadora,
            tokenEnviado,
            onTokenValidado: async (_token: string, tokenValidado: boolean) => {
              if (tokenValidado) {
                try {
                  await atualizarStatusEmLote(evento.idEvento, "COMPARECEU");

                  await api.patch(`/sisclinic/agenda/${evento.idEvento}`, {
                    tokenValidado: true,
                  });

                  await Swal.fire({
                    title: "Token Validado!",
                    html: `<div class="text-green-200 text-center">Token validado com sucesso e status atualizado para "Compareceu"!</div>`,
                    icon: "success",
                    background: "#1f2937",
                    color: "#f9fafb",
                    confirmButtonText: "Concluir",
                  });

                  fetchAgenda();
                } catch (error) {
                  console.error("Erro ao salvar validação do token:", error);
                  await Swal.fire({
                    title: "Aviso",
                    text: "Token validado, mas houve um erro ao salvar no sistema.",
                    icon: "warning",
                    background: "#1f2937",
                    color: "#f9fafb",
                  });
                }
              } else {
                await Swal.fire({
                  title: "Token Validado!",
                  html: `<div class="text-green-200 text-center">Token validado com sucesso!</div>`,
                  icon: "success",
                  background: "#1f2937",
                  color: "#f9fafb",
                  confirmButtonText: "Concluir",
                });
              }
            },
            onReenviarToken: async () => {
            return await TokenEnviar({
                nome,
                nrCarteiraPlano,
                senhaGuia,
                numeroGuiaGerado,
                numeroGuiaOperadora,
                isReenvio: true,
              silencioso: true,
            });
              tokenEnviado = true;
            },
          });

          if ((result as any).tokenDigitado) break;
        }
      }
    } catch (error: any) {
      Swal.close();
      console.error("Erro na autorização:", error);
      // CORREÇÃO: extrair a mensagem de erro específica da resposta da API
      const errorMessage =
        error?.response?.data?.mensagemErro ||
        error?.response?.data?.message ||
        error?.message ||
        "Falha ao autorizar.";

      await Swal.fire({
        title: "Erro na Autorização",
        html: `
        <div class="text-center space-y-4">
          <div class="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/20 p-5">
            <p class="text-lg font-black uppercase tracking-[0.16em] text-red-200">
              PROCURE A RECEPÇÃO
            </p>
          </div>
        </div>
      `,
        icon: "error",
        confirmButtonText: "Tentar Novamente",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        background: "#1f2937",
        color: "#f9fafb",
        width: "500px",
      }).then((result) => {
        if (result.isConfirmed) marcarAutorizacao(evento);
      });
    }
  };

  const handleChangeObservacao = (idEvento: number, texto: string) => {
    setObservacoesEditadas((prev) => ({ ...prev, [idEvento]: texto }));
  };

  const handleSalvarObservacao = async (item: AgendaEvento) => {
    const novaObs = (observacoesEditadas[item.idEvento] ?? "").trim();
    if (novaObs === (item.descricaoEvento ?? "").trim()) return;
    try {
      await api.patch(
        `/sisclinic/agenda/${item.idEvento}`,
        {
          horario: String(item.horaInicio || "").slice(0, 5),
          descricaoEvento: novaObs,
          statusAgendamento: item.statusAgendamento,
        },
      );

      setAgenda((prev) =>
        prev.map((evento) =>
          evento.idEvento === item.idEvento
            ? { ...evento, descricaoEvento: novaObs }
            : evento,
        ),
      );
      setObservacoesEditadas((prev) => ({
        ...prev,
        [item.idEvento]: novaObs,
      }));
      toast.success("Observação salva com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar observação:", err);
      toast.error("Erro ao salvar observação. Tente novamente.");
    }
  };

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




























