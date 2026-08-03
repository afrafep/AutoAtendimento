import { api } from "../config/configApi";
import { toast } from "react-toastify";
import { inteliteSenhaService } from "../services/inteliteSenhaService";
import type { AgendaEvento, DadosGuiaAutorizacao } from "../types/agenda";

const AUTH_DEFAULTS = {
  autorizado: false,
  senhaAutorizacao: "",
  tokenValidado: false,
  retorno: false,
};

interface SharedContext {
  guiasAutorizacao: Record<number, DadosGuiaAutorizacao>;
  setGuiasAutorizacao: any;
  observacoesEditadas: Record<number, string>;
  setObservacoesEditadas: any;
  setAgenda: any;
}

export const createAgendaDetalhadaShared = ({
  guiasAutorizacao,
  setGuiasAutorizacao,
  observacoesEditadas,
  setObservacoesEditadas,
  setAgenda,
}: SharedContext) => {
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

  return {
    persistirDadosGuiaAutorizacao,
    obterDadosGuiaAutorizacao,
    obterNumeroLocalAutoAtendimento,
    obterIdTipoAtendimentoEncaminhamento,
    encaminharSenhaPainelParaMedico,
    handleChangeObservacao,
    handleSalvarObservacao,
  };
};

export { AUTH_DEFAULTS };
