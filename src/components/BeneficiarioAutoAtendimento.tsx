"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  FaClipboardList,
  FaUserCircle,
  FaUserMd,
} from "react-icons/fa";
import AtendimentoResumoCard from "./AtendimentoResumoCard";
import { TokenEnviar } from "./TokenEnviar";
import { TokenValidar } from "./TokenValidar";
import { api } from "../config/configApi";
import { useAgendaDetalhada } from "../hooks/useAgendaDetalhada";
import { inteliteSenhaService } from "../services/inteliteSenhaService";
import type { AgendaEvento } from "../types/agenda";


interface ConsultaAutoAtendimento {
  idEvento: number;
  idProfissional: number | string;
  nomeEvento?: string | null;
  descricaoEvento?: string | null;
  dataInicio: string;
  horaInicio: string;
  dataFim?: string | null;
  horaFim?: string | null;
  categoria?: string | null;
  statusAgendamento: string;
  corEvento?: string | null;
  celularContato?: string | null;
  idProfissionalRealizaProcedimento?: number | null;
  retorno?: boolean;
  localAgendamento?: string | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
  usuarioCriacao?: string | null;
  usuarioUpdate?: string | null;
  prioridadePainel?: string | null;
  cdPaciente?: number | null;
  procedimentos?: any[];
  profissionalNome: string;
  especialidadeNome: string;
  pacienteNome: string;
  nuCpf: string;
  nrCarteiraPlano: string;
  autorizado: boolean;
  tokenValidado: boolean;
  senhaAutorizacao: string;
  numeroGuiaOperadora?: number | null;
  numeroGuiaGerado?: string | null;
  senhaPainel?: string | null;
  localidadePainel?: string | null;
}

interface ConsultaCardAgrupado {
  chave: string;
  consultaBase: ConsultaAutoAtendimento;
  consultasRelacionadas: ConsultaAutoAtendimento[];
  agrupadoUltrassom: boolean;
}

const normalizarCpf = (valor?: string) => String(valor || "").replace(/\D/g, "");

const cpfPossuiDigitosRepetidos = (cpf: string) => /^(\d)\1{10}$/.test(cpf);

const validarCpf = (valor?: string) => {
  const cpf = normalizarCpf(valor);

  if (cpf.length !== 11) return false;
  if (cpfPossuiDigitosRepetidos(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i += 1) {
    soma += Number(cpf[i]) * (10 - i);
  }

  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i += 1) {
    soma += Number(cpf[i]) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(cpf[10])) return false;

  return true;
};

const formatarCpf = (valor?: string) => {
  const cpfNumerico = normalizarCpf(valor).slice(0, 11);

  if (cpfNumerico.length <= 3) return cpfNumerico;
  if (cpfNumerico.length <= 6) {
    return `${cpfNumerico.slice(0, 3)}.${cpfNumerico.slice(3)}`;
  }
  if (cpfNumerico.length <= 9) {
    return `${cpfNumerico.slice(0, 3)}.${cpfNumerico.slice(3, 6)}.${cpfNumerico.slice(6)}`;
  }

  return `${cpfNumerico.slice(0, 3)}.${cpfNumerico.slice(3, 6)}.${cpfNumerico.slice(6, 9)}-${cpfNumerico.slice(9)}`;
};

const mascararCpfConfirmacao = (valor?: string) => {
  const cpfFormatado = formatarCpf(valor);
  if (cpfFormatado.length !== 14) return cpfFormatado;
  return `${cpfFormatado.slice(0, 3)}.***.***-${cpfFormatado.slice(-2)}`;
};

const formatarCpfComLacuna = (valor: string, inicioOculto: number, tamanho = 2) => {
  const digitos = normalizarCpf(valor).split("");

  for (let i = 0; i < tamanho; i += 1) {
    if (digitos[inicioOculto + i] !== undefined) {
      digitos[inicioOculto + i] = "_";
    }
  }

  return `${digitos.slice(0, 3).join("")}.${digitos.slice(3, 6).join("")}.${digitos.slice(6, 9).join("")}-${digitos.slice(9, 11).join("")}`;
};

const normalizarBoolean = (valor: unknown) => {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  const texto = String(valor ?? "").trim().toLowerCase();
  if (texto === "1" || texto === "true") return true;
  if (texto === "0" || texto === "false") return false;
  return Boolean(valor);
};

const formatarHora = (hora?: string) => String(hora || "").slice(0, 5) || "--:--";

const formatarStatus = (status?: string) => {
  const statusSeguro = String(status || "").trim();
  return statusSeguro || "NÃO INFORMADO";
};

const formatarData = (data?: string) => {
  if (!data) return "--/--/----";
  const [ano, mes, dia] = String(data).split("T")[0].split("-");
  if (!ano || !mes || !dia) return "--/--/----";
  return `${dia}/${mes}/${ano}`;
};

const formatarDataAtual = () => {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = String(hoje.getFullYear());
  return `${dia}/${mes}/${ano}`;
};

const ordenarPorHora = (consultas: ConsultaAutoAtendimento[]) =>
  [...consultas].sort((a, b) =>
    String(a.horaInicio || "").localeCompare(String(b.horaInicio || "")),
  );

const ehMedicoUltrassonografista = (consulta: ConsultaAutoAtendimento) =>
  String(consulta.especialidadeNome || "")
    .trim()
    .toUpperCase()
    .includes("MEDICO ULTRASSONOGRAFISTA");

const obterExecutanteConsulta = (consulta: ConsultaAutoAtendimento) =>
  String(
    consulta.idProfissionalRealizaProcedimento || consulta.idProfissional || "",
  );

const obterDescricaoProcedimentoConsulta = (consulta: ConsultaAutoAtendimento) => {
  const procedimentos = Array.isArray(consulta.procedimentos)
    ? consulta.procedimentos
    : [];

  const nomes = procedimentos
    .map((proc: any) => String(proc?.nmProcedimento || "").trim())
    .filter(Boolean);

  if (nomes.length > 0) {
    return nomes.join(" / ");
  }

  return String(
    consulta.descricaoEvento || consulta.nomeEvento || "Procedimento não informado",
  ).trim();
};

const criarEventoBaseDaConsulta = (
  consulta: ConsultaAutoAtendimento,
): AgendaEvento => ({
  idEvento: Number(consulta.idEvento),
  horaInicio: String(consulta.horaInicio || ""),
  horaFim: String(consulta.horaFim || consulta.horaInicio || ""),
  descricaoEvento: String(consulta.descricaoEvento || consulta.nomeEvento || ""),
  categoria: String(consulta.categoria || "CONSULTA"),
  nomeEvento: String(consulta.nomeEvento || consulta.descricaoEvento || "CONSULTA"),
  corEvento: String(consulta.corEvento || "#e1e1e1"),
  paciente: {
    nmPaciente: String(consulta.pacienteNome || ""),
    dtNascimento: "",
    nuCpf: String(consulta.nuCpf || ""),
    cdPaciente: consulta.cdPaciente || undefined,
    nrCarteiraPlano: String(consulta.nrCarteiraPlano || ""),
  },
  profissional: {
    idProfissional: consulta.idProfissional,
    nmProfissional: String(consulta.profissionalNome || ""),
    especialidade: {
      dsEspecialidade: String(consulta.especialidadeNome || ""),
    },
  },
  celularContato: String(consulta.celularContato || ""),
  statusAgendamento: String(consulta.statusAgendamento || "AGENDADO"),
  dataInicio: String(consulta.dataInicio || ""),
  nuCpf: String(consulta.nuCpf || ""),
  localAgendamento: consulta.localAgendamento || null,
  autorizado: Boolean(consulta.autorizado),
  retorno: Boolean(consulta.retorno),
  tokenValidado: Boolean(consulta.tokenValidado),
  senhaAutorizacao: consulta.senhaAutorizacao || null,
  senhaPainel: consulta.senhaPainel || null,
  prioridadePainel: consulta.prioridadePainel || null,
  localidadePainel: consulta.localidadePainel || null,
  numeroGuiaGerado: consulta.numeroGuiaGerado || null,
  numeroGuiaOperadora: consulta.numeroGuiaOperadora || null,
  procedimentos: Array.isArray(consulta.procedimentos) ? consulta.procedimentos : [],
  idProfissionalRealizaProcedimento:
    consulta.idProfissionalRealizaProcedimento || undefined,
});

interface ModalAutorizacaoProps {
  consulta: ConsultaAutoAtendimento;
  onClose: () => void;
  onAfterFlow: () => Promise<void>;
  iniciarAutomaticamente?: boolean;
}


const ModalAutorizacaoBeneficiario: React.FC<ModalAutorizacaoProps> = ({
  consulta,
  onClose,
  onAfterFlow,
  iniciarAutomaticamente = false,
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
    [consulta],
  );

  const eventoCompleto = useMemo(
    () =>
      agenda.find(
        (item: any) => Number(item.idEvento) === Number(consulta.idEvento),
      ),
    [agenda, consulta.idEvento],
  );

  const iniciarFluxoAgenda = async (mostrarAvisoCarregando = true) => {
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
        abrirTokenDiretoAposEnvio: iniciarAutomaticamente,
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
    void iniciarFluxoAgenda(false);
  }, [eventoCompleto, iniciarAutomaticamente, loading]);

  if (iniciarAutomaticamente) {
    return null;
  }

  if (etapa === "confirmacao") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4">
        <div className="w-full max-w-[560px] rounded-2xl border border-slate-700 bg-[#1f2937] p-6 shadow-2xl shadow-black/50">
          <div className="mb-5 flex items-center gap-2.5 text-white">
            <div className="text-pink-300">
              <FaClipboardList size={28} />
            </div>
            <h2 className="text-[1.45rem] font-black tracking-tight">{"Autorização TISS SADT"}</h2>
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
                  {"Carteira: "}{consulta.nrCarteiraPlano || "Não informada"}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-600 bg-slate-800/55 p-4">
            <div className="mb-4 flex items-center gap-3 text-white">
              <FaUserMd className="text-cyan-300" size={20} />
              <h3 className="text-[1.02rem] font-bold">Detalhes do Profissional</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-slate-700/60 p-3.5">
                <div className="text-[0.72rem] text-slate-300">Profissional</div>
                <div className="mt-1 text-[1.08rem] font-bold text-white">
                  {consulta.profissionalNome}
                </div>
              </div>
              <div className="rounded-xl bg-slate-700/60 p-3.5">
                <div className="text-[0.72rem] text-slate-300">Data/Hora</div>
                <div className="mt-1 text-[1.08rem] font-bold text-white">
                  {formatarData(consulta.dataInicio)} {formatarHora(consulta.horaInicio)}
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
  }


  return null;
};

const CHAVE_ESTADO_TELA = "beneficiario:autoatendimento:estado-tela";

interface EstadoTelaPersistido {
  cpf: string;
  pacienteNome: string;
  consultas: ConsultaAutoAtendimento[];
  etapaTela: "cpf" | "consultas";
}

type EtapaTelaAutoAtendimento = "boasVindas" | "cpf" | "consultas" | "senha";
type LocalProfissionalDia = {
  idProfissional?: number | string;
  nomeLocal?: string;
  nrLocal?: string;
  status?: string;
  data?: string;
  periodo?: string;
};

const lerEstadoTelaPersistido = (): EstadoTelaPersistido | null => {
  try {
    if (typeof window === "undefined") return null;
    const salvo = sessionStorage.getItem(CHAVE_ESTADO_TELA);
    if (!salvo) return null;
    const estado = JSON.parse(salvo);
    if (!estado || typeof estado !== "object") return null;
    return {
      cpf: typeof estado.cpf === "string" ? estado.cpf : "",
      pacienteNome: typeof estado.pacienteNome === "string" ? estado.pacienteNome : "",
      consultas: Array.isArray(estado.consultas)
        ? estado.consultas.map((consulta: any) => ({
            ...consulta,
            autorizado: normalizarBoolean(consulta?.autorizado),
            tokenValidado: normalizarBoolean(consulta?.tokenValidado),
            retorno: normalizarBoolean(consulta?.retorno),
          }))
        : [],
      etapaTela: estado.etapaTela === "consultas" ? "consultas" : "cpf",
    };
  } catch {
    return null;
  }
};

const salvarEstadoTelaPersistido = (estado: EstadoTelaPersistido) => {
  try {
    sessionStorage.setItem(CHAVE_ESTADO_TELA, JSON.stringify(estado));
  } catch {}
};

const limparEstadoTelaPersistido = () => {
  try {
    sessionStorage.removeItem(CHAVE_ESTADO_TELA);
  } catch {}
};

const BeneficiarioAutoAtendimento: React.FC = () => {
  const locaisProfissionaisPorDataCacheRef = useRef<
    Record<string, Promise<LocalProfissionalDia[]>>
  >({});
  const [hidratado, setHidratado] = useState(false);
  const [cpf, setCpf] = useState("");
  const [pacienteNome, setPacienteNome] = useState("");
  const [consultas, setConsultas] = useState<ConsultaAutoAtendimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultaProcessandoSenhaId, setConsultaProcessandoSenhaId] = useState<number | null>(null);
  const [consultaAutorizacaoAberta, setConsultaAutorizacaoAberta] =
    useState<ConsultaAutoAtendimento | null>(null);
  const [iniciarAutorizacaoAutomaticamente, setIniciarAutorizacaoAutomaticamente] =
    useState(false);
  const [senhasPainelDigitadas, setSenhasPainelDigitadas] = useState<Record<number, string>>({});
  const [consultaSelecionadaId, setConsultaSelecionadaId] = useState<number | null>(null);
  const [indiceConsultaAtual, setIndiceConsultaAtual] = useState(0);
  const [etapaTela, setEtapaTela] = useState<EtapaTelaAutoAtendimento>("cpf");
  const [mostrarTecladoCpf, setMostrarTecladoCpf] = useState(false);

  const consultaSelecionada =
    consultas.find((consulta) => consulta.idEvento === consultaSelecionadaId) || null;

  const cardsConsultas = useMemo<ConsultaCardAgrupado[]>(() => {
    const mapa = new Map<string, ConsultaCardAgrupado>();

    consultas.forEach((consulta) => {
      const agrupadoUltrassom = ehMedicoUltrassonografista(consulta);
      const chave = agrupadoUltrassom
        ? [
            normalizarCpf(consulta.nuCpf),
            String(consulta.dataInicio || "").split("T")[0],
            obterExecutanteConsulta(consulta),
          ].join("::")
        : `evento::${consulta.idEvento}`;

      const existente = mapa.get(chave);

      if (!existente) {
        mapa.set(chave, {
          chave,
          consultaBase: consulta,
          consultasRelacionadas: [consulta],
          agrupadoUltrassom,
        });
        return;
      }

      const consultasRelacionadas = ordenarPorHora([
        ...existente.consultasRelacionadas,
        consulta,
      ]);

      mapa.set(chave, {
        ...existente,
        consultaBase: consultasRelacionadas[0] || existente.consultaBase,
        consultasRelacionadas,
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.consultaBase.horaInicio || "").localeCompare(
        String(b.consultaBase.horaInicio || ""),
      ),
    );

  }, [consultas]);

  const cardsConsultasFluxo = useMemo(
    () =>
      cardsConsultas.map((cardConsulta, indice) => {
        const consulta = cardConsulta.consultaBase;
        const autorizado = normalizarBoolean(consulta.autorizado);
        const tokenValidado = normalizarBoolean(consulta.tokenValidado);

        return {
          cardConsulta,
          consulta,
          indice,
          etapaAtual: indice + 1,
          total: cardsConsultas.length,
          autorizado,
          tokenValidado,
          tokenEnviado: autorizado,
          autorizacaoConcluida: autorizado && tokenValidado,
        };
      }),
    [cardsConsultas],
  );

  const indiceMaximoLiberado = useMemo(() => {
    let maiorIndiceLiberado = 0;

    cardsConsultasFluxo.forEach((item, indice) => {
      if (item.autorizacaoConcluida) {
        maiorIndiceLiberado = Math.min(indice + 1, cardsConsultasFluxo.length - 1);
      }
    });

    return maiorIndiceLiberado;
  }, [cardsConsultasFluxo]);

  const consultaFluxoAtual = cardsConsultasFluxo[indiceConsultaAtual] || null;


  const dataConsultasCabecalho = useMemo(
    () => formatarData(cardsConsultas[0]?.consultaBase.dataInicio),
    [cardsConsultas],
  );
  const dataCabecalhoAtual = useMemo(() => formatarDataAtual(), []);

  useEffect(() => {
    const estadoPersistidoInicial = lerEstadoTelaPersistido();

    if (estadoPersistidoInicial) {
      setCpf(formatarCpf(estadoPersistidoInicial.cpf || ""));
      setPacienteNome(estadoPersistidoInicial.pacienteNome || "");
      setConsultas(estadoPersistidoInicial.consultas || []);
      if (
        estadoPersistidoInicial.etapaTela === "consultas" &&
        estadoPersistidoInicial.consultas.length > 0
      ) {
        setEtapaTela("consultas");
        setIndiceConsultaAtual(0);
      }
    }

    setHidratado(true);
  }, []);

  useEffect(() => {
    if (cardsConsultasFluxo.length === 0) {
      if (indiceConsultaAtual !== 0) {
        setIndiceConsultaAtual(0);
      }
      return;
    }

    if (indiceConsultaAtual > indiceMaximoLiberado) {
      setIndiceConsultaAtual(indiceMaximoLiberado);
      return;
    }

    if (indiceConsultaAtual > cardsConsultasFluxo.length - 1) {
      setIndiceConsultaAtual(cardsConsultasFluxo.length - 1);
    }
  }, [cardsConsultasFluxo, indiceConsultaAtual, indiceMaximoLiberado]);

  if (!hidratado) {
    return null;
  }


  const persistirTelaConsultas = (cpfAtual: string, nomeAtual: string, consultasAtuais: ConsultaAutoAtendimento[]) => {
    salvarEstadoTelaPersistido({
      cpf: formatarCpf(cpfAtual),
      pacienteNome: nomeAtual,
      consultas: consultasAtuais,
      etapaTela: "consultas",
    });
  };

  const resetarTelaCpf = () => {
    setCpf("");
    setPacienteNome("");
    setConsultas([]);
    setConsultaAutorizacaoAberta(null);
    setIniciarAutorizacaoAutomaticamente(false);
    setConsultaSelecionadaId(null);
    setIndiceConsultaAtual(0);
    setSenhasPainelDigitadas({});
    setMostrarTecladoCpf(false);
    setEtapaTela("cpf");
    limparEstadoTelaPersistido();
  };
  const atualizarTextoSenhaPainel = (idEvento: number, valor: string) => {
    setSenhasPainelDigitadas((prev) => ({
      ...prev,
      [idEvento]: String(valor || "").toUpperCase(),
    }));
  };


  const abrirEtapaSenha = async (consulta: ConsultaAutoAtendimento) => {
    setConsultaSelecionadaId(consulta.idEvento);
    setEtapaTela("senha");

    if (String(consulta.senhaPainel || "").trim()) {
      if (!consulta.autorizado) {
        await abrirAutorizacaoComCompareceu(consulta, true);
      }
      return;
    }

    setConsultaProcessandoSenhaId(consulta.idEvento);

    try {
      const senhaGerada = await emitirSenhaPainelAutomaticamente(consulta);

      await vincularSenhaPainel(consulta, {
        senhaPainelForcada: senhaGerada,
        abrirAutorizacaoAposVinculo: true,
      });
    } catch (error) {
      console.error("Erro ao gerar senha do painel:", error);
      await Swal.fire(
        "Erro",
        "Não foi possível gerar e vincular a senha deste atendimento.",
        "error",
      );
    } finally {
      setConsultaProcessandoSenhaId(null);
    }
  };

  const voltarParaConsultas = () => {
    setEtapaTela("consultas");
    setConsultaSelecionadaId(null);
  };

  const confirmarEncerramentoAutoAtendimento = async () => {
    const confirmacao = await Swal.fire({
      title: "Encerrar autoatendimento?",
      text: "Deseja encerrar o autoatendimento e voltar para o início?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, encerrar",
      cancelButtonText: "Nao",
      confirmButtonColor: "#00338d",
    });

    if (!confirmacao.isConfirmed) return;

    resetarTelaCpf();
  };

  const handleCpfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cpfFormatado = formatarCpf(event.target.value);
    setCpf(cpfFormatado);

    if (normalizarCpf(cpfFormatado).length === 11) {
      void buscarConsultas(cpfFormatado);
    }
  };

  const handleCpfKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const teclasPermitidas = new Set([
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Enter",
    ]);

    if (event.ctrlKey || event.metaKey) {
      return;
    }

    if (teclasPermitidas.has(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleCpfPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const textoColado = event.clipboardData.getData("text");
    const cpfFormatado = formatarCpf(textoColado);
    setCpf(cpfFormatado);

    if (normalizarCpf(cpfFormatado).length === 11) {
      void buscarConsultas(cpfFormatado);
    }
  };

  const adicionarDigitoCpf = (digito: string) => {
    if (!/^\d$/.test(digito)) return;

    const cpfAtual = normalizarCpf(cpf);
    if (cpfAtual.length >= 11) return;

    const cpfFormatado = formatarCpf(`${cpfAtual}${digito}`);
    setCpf(cpfFormatado);

    if (normalizarCpf(cpfFormatado).length === 11) {
      void buscarConsultas(cpfFormatado);
    }
  };

  const apagarUltimoDigitoCpf = () => {
    const cpfAtual = normalizarCpf(cpf);
    setCpf(formatarCpf(cpfAtual.slice(0, -1)));
  };

  const limparCpfDigitado = () => {
    setCpf("");
  };

  const atualizarConsultaLocal = (
    idEvento: number,
    changes: Partial<ConsultaAutoAtendimento>,
  ) => {
    setConsultas((prev) =>
      prev.map((item) =>
        item.idEvento === idEvento ? { ...item, ...changes } : item,
      ),
    );
  };

  const buscarLocaisProfissionaisPorData = (data: string) => {
    if (!locaisProfissionaisPorDataCacheRef.current[data]) {
      locaisProfissionaisPorDataCacheRef.current[data] = api
        .get<LocalProfissionalDia[]>(
          `/sisclinic/local-atendimento-pessoas/profissionais/dia/${data}`,
        )
        .then((response) => response.data || [])
        .catch((error) => {
          delete locaisProfissionaisPorDataCacheRef.current[data];
          throw error;
        });
    }

    return locaisProfissionaisPorDataCacheRef.current[data];
  };

  const obterPeriodoPorHora = (hora?: string) => {
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

  const buscarLocalidadePainelDoProfissional = async (
    consulta: ConsultaAutoAtendimento,
  ) => {
    if (!consulta.idProfissional) {
      return String(consulta.localidadePainel || "Não informado").trim() || null;
    }

    try {
      const dataReferencia =
        String(consulta.dataInicio || "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10);
      const locaisDoDia = await buscarLocaisProfissionaisPorData(dataReferencia);
      const periodoConsulta = obterPeriodoPorHora(consulta.horaInicio);
      const localDoProfissional =
        locaisDoDia.find((local) => {
          const mesmoProfissional =
            String(local?.idProfissional || "") === String(consulta.idProfissional || "");
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

  const preencherLocaisDasConsultas = async (
    consultasOriginais: ConsultaAutoAtendimento[],
  ) => {
    if (consultasOriginais.length === 0) {
      return consultasOriginais;
    }

    const consultasComLocal = await Promise.all(
      consultasOriginais.map(async (consulta) => {
        if (String(consulta.localidadePainel || "").trim() || !consulta.idProfissional) {
          return consulta;
        }

        const dataReferencia =
          String(consulta.dataInicio || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10);

        try {
          const locaisDoDia = await buscarLocaisProfissionaisPorData(dataReferencia);
          const periodoConsulta = obterPeriodoPorHora(consulta.horaInicio);
          const localDoProfissional =
            locaisDoDia.find((local) => {
              const mesmoProfissional =
                String(local?.idProfissional || "") === String(consulta.idProfissional || "");
              const statusAtivo = !local?.status || String(local.status).toUpperCase() === "ATIVO";
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

  const obterIdTipoAtendimentoPainel = async (consulta: ConsultaAutoAtendimento) => {
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

        return nomeTipo === prioridadeDesejada || prefixoTipo === prioridadeDesejada;
      }) ||
      tiposAtendimento.find((tipo) =>
        String(tipo.tipoAtendimento || "").trim().toUpperCase().includes("CONSULTA"),
      ) ||
      tiposAtendimento[0];

    const idTipoAtendimento = String(tipoCompativel?.id || "").trim();

    if (!idTipoAtendimento) {
      throw new Error("Tipo de atendimento Intelite inválido para emissão.");
    }

    return idTipoAtendimento;
  };

  const emitirSenhaPainelAutomaticamente = async (consulta: ConsultaAutoAtendimento) => {
    const idTipoAtendimento = await obterIdTipoAtendimentoPainel(consulta);
    const resposta = await inteliteSenhaService.emitirSenha({
      idTipoAtendimento,
      nomePaciente: consulta.pacienteNome,
      telefone: normalizarCpf(consulta.celularContato || ""),
      codigo: String(consulta.idEvento),
    });

    const senhaGerada = String(resposta?.senhaEmitida || "")
      .trim()
      .toUpperCase();

    if (!senhaGerada) {
      throw new Error("A Intelite não retornou a senha emitida.");
    }

    return senhaGerada;
  };

  const vincularSenhaPainel = async (
    consulta: ConsultaAutoAtendimento,
    opcoes?: {
      senhaPainelForcada?: string;
      abrirAutorizacaoAposVinculo?: boolean;
    },
  ) => {
    const senhaPainelInformada = String(
      opcoes?.senhaPainelForcada || senhasPainelDigitadas[consulta.idEvento] || "",
    )
      .trim()
      .toUpperCase();
    const senhaPainelAtual = String(consulta.senhaPainel || "")
      .trim()
      .toUpperCase();
    const senhaPainel = senhaPainelInformada || senhaPainelAtual;
    const localidadePainel =
      (await buscarLocalidadePainelDoProfissional(consulta)) || "Não informado";

    if (!senhaPainel) {
      await Swal.fire(
        "Informe a senha",
        "Digite a senha do painel para vincular este atendimento.",
        "warning",
      );
      return;
    }

    if (senhaPainelAtual && senhaPainel === senhaPainelAtual) {
      if (opcoes?.abrirAutorizacaoAposVinculo !== false && !consulta.autorizado) {
        await abrirAutorizacaoComCompareceu(consulta, true);
      }
      return;
    }

    try {
      const prioridadePainel =
        String(consulta.prioridadePainel || "").trim() || "CONSULTA";
      const payloadAgenda = {
        nomeEvento: consulta.nomeEvento || "",
        descricaoEvento: consulta.descricaoEvento || "",
        dataInicio: consulta.dataInicio,
        horaInicio: consulta.horaInicio,
        dataFim: consulta.dataFim || null,
        horaFim: consulta.horaFim || null,
        categoria: consulta.categoria || "CONSULTA",
        idProfissional: Number(consulta.idProfissional || 0),
        statusAgendamento: consulta.statusAgendamento || "AGENDADO",
        corEvento: consulta.corEvento || "#e1e1e1",
        idProfissionalRealizaProcedimento:
          consulta.idProfissionalRealizaProcedimento || null,
        retorno: Boolean(consulta.retorno),
        autorizado: Boolean(consulta.autorizado),
        senhaAutorizacao: consulta.senhaAutorizacao || "",
        tokenValidado: Boolean(consulta.tokenValidado),
        localAgendamento: consulta.localAgendamento || "CENTRO_MEDICO",
        nuCpf: consulta.nuCpf || "",
        celularContato: consulta.celularContato || "",
        cdPaciente: consulta.cdPaciente || null,
        procedimentos: consulta.procedimentos || [],
        senhaPainel,
        prioridadePainel,
        localidadePainel,
        criadoEm: consulta.criadoEm || null,
        atualizadoEm: new Date().toISOString(),
        usuarioCriacao: consulta.usuarioCriacao || "",
        usuarioUpdate:
          sessionStorage.getItem("user") ||
          sessionStorage.getItem("usuario") ||
          consulta.usuarioUpdate ||
          "",
      };

      await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, payloadAgenda, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { data: agendaValidacao } = await api.get(
        "/sisclinic/agenda/filtrar",
        {
          params: {
            idProfissional: consulta.idProfissional,
            data: consulta.dataInicio,
          },
        },
      );

      const eventoValidado = Array.isArray(agendaValidacao)
        ? agendaValidacao.find(
            (evento: any) => String(evento.idEvento) === String(consulta.idEvento),
          )
        : null;

      if (
        !eventoValidado ||
        String(eventoValidado.senhaPainel || "").trim().toUpperCase() !== senhaPainel ||
        String(eventoValidado.prioridadePainel || "").trim() !== prioridadePainel
      ) {
        setSenhasPainelDigitadas((prev) => ({
          ...prev,
          [consulta.idEvento]: "",
        }));
        await Swal.fire(
          "Atenção",
          "O backend respondeu, mas a senha não apareceu salva na agenda. Tente atualizar e verificar novamente.",
          "warning",
        );
        return;
      }

      const senhaValidada = String(eventoValidado.senhaPainel || "")
        .trim()
        .toUpperCase();
      const prioridadeValidada =
        String(eventoValidado.prioridadePainel || "").trim() || prioridadePainel;
      const localidadeValidada =
        String(eventoValidado.localidadePainel || "").trim() || localidadePainel;

      const consultasAtualizadas = consultas.map((item) =>
        item.idEvento === consulta.idEvento
          ? {
              ...item,
              senhaPainel: senhaValidada,
              prioridadePainel: prioridadeValidada,
              localidadePainel: localidadeValidada,
            }
          : item,
      );

      setConsultas(consultasAtualizadas);
      setSenhasPainelDigitadas((prev) => ({
        ...prev,
        [consulta.idEvento]: "",
      }));
      persistirTelaConsultas(
        normalizarCpf(cpf),
        pacienteNome || consulta.pacienteNome,
        consultasAtualizadas,
      );

      const consultaAtualizada =
        consultasAtualizadas.find((item) => item.idEvento === consulta.idEvento) ||
        {
          ...consulta,
          senhaPainel: senhaValidada,
          prioridadePainel: prioridadeValidada,
          localidadePainel: localidadeValidada,
        };

      const deveContinuarAutomaticamente =
        opcoes?.abrirAutorizacaoAposVinculo !== false && !consultaAtualizada.autorizado;

      if (!deveContinuarAutomaticamente) {
        await Swal.fire(
          "Senha vinculada",
          `A senha ${senhaPainel} foi vinculada com sucesso.`, 
          "success",
        );
      }

      if (deveContinuarAutomaticamente) {
        await abrirAutorizacaoComCompareceu(consultaAtualizada, true);
      }
    } catch (error) {
      console.error("Erro ao vincular senha do painel:", error);
      await Swal.fire(
        "Erro",
        "Não foi possível vincular a senha deste atendimento.",
        "error",
      );
    }
  };
  const abrirValidacaoTokenDireta = async (consulta: ConsultaAutoAtendimento) => {
    const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
    const numeroGuiaOperadora = Number(
      consulta.numeroGuiaOperadora || consulta.senhaAutorizacao || 0,
    );

    if (!senhaGuia) {
      await Swal.fire(
        "Atenção",
        "Não encontramos a senha da guia para validar o token.",
        "warning",
      );
      return;
    }

    await TokenValidar({
      nome: consulta.pacienteNome,
      nrCarteiraPlano: consulta.nrCarteiraPlano,
      senhaGuia,
      numeroGuiaGerado: consulta.numeroGuiaGerado || undefined,
      numeroGuiaOperadora,
      tokenEnviado: true,
      onTokenValidado: async (_token: string, tokenValidado: boolean) => {
        if (!tokenValidado) return;

        await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
          tokenValidado: true,
        });

        const consultasAtualizadas = consultas.map((item) =>
          item.idEvento === consulta.idEvento ? { ...item, tokenValidado: true } : item,
        );

        atualizarConsultaLocal(consulta.idEvento, {
          tokenValidado: true,
        });
        persistirTelaConsultas(normalizarCpf(cpf), pacienteNome || consulta.pacienteNome, consultasAtualizadas);
      },
      onReenviarToken: async () => {
        return await TokenEnviar({
          nome: consulta.pacienteNome,
          nrCarteiraPlano: consulta.nrCarteiraPlano,
          senhaGuia,
          numeroGuiaGerado: consulta.numeroGuiaGerado || undefined,
          numeroGuiaOperadora,
          isReenvio: true,
              silencioso: true,
            });
      },
    });

    await buscarConsultas();
  };

  const buscarConsultas = async (cpfInformado?: string) => {
    const cpfLimpo = normalizarCpf(cpfInformado ?? cpf);

    if (!validarCpf(cpfLimpo)) {
      await Swal.fire({
        title: "Atenção",
        html: "Digite um CPF válido.<br />Sequências como Ex: 111.111.111-11 não são permitidas.",
        icon: "warning",
      });
      return;
    }

    const hoje = new Date().toISOString().split("T")[0];
    setLoading(true);

    try {
      const response = await api.get("/sisclinic/agenda/relatorio/beneficiario", {
        params: {
          nuCpf: cpfLimpo,
          dataInicio: hoje,
          dataFim: hoje,
        },
      });

      const itens = Array.isArray(response.data) ? response.data : [];
      const consultasMapeadas = itens
        .filter((item: any) => {
          if (!item?.dataInicio) return false;
          const data = new Date(item.dataInicio);
          return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(hoje);
        })
        .map(
          (item: any): ConsultaAutoAtendimento => ({
            idEvento: Number(item.idEvento),
            idProfissional: item.profissional?.idProfissional || "",
            dataInicio: String(item.dataInicio || ""),
            horaInicio: String(item.horaInicio || ""),
            statusAgendamento: String(item.statusAgendamento || "AGENDADO"),
            profissionalNome:
              item.profissional?.nmProfissional || "Profissional não informado",
            especialidadeNome:
              item.profissional?.especialidade?.dsEspecialidade ||
              "Especialidade não informada",
            pacienteNome: item.paciente?.nmPaciente || "Beneficiário não informado",
            nuCpf: item.paciente?.nuCpf || item.nuCpf || cpfLimpo,
            nrCarteiraPlano: String(
              item.paciente?.nrCarteiraPlano || item.nrCarteiraPlano || "",
            ),
            autorizado: normalizarBoolean(item.autorizado),
            tokenValidado: normalizarBoolean(item.tokenValidado),
            senhaAutorizacao: String(item.senhaAutorizacao || ""),
            numeroGuiaOperadora: item.numeroGuiaOperadora ?? null,
            numeroGuiaGerado: item.numeroGuiaGerado ?? null,
            senhaPainel: item.senhaPainel ?? null,
            localidadePainel: item.localidadePainel ?? null,
            nomeEvento: item.nomeEvento ?? null,
            descricaoEvento: item.descricaoEvento ?? null,
            dataFim: item.dataFim ?? null,
            horaFim: item.horaFim ?? null,
            categoria: item.categoria ?? null,
            corEvento: item.corEvento ?? null,
            celularContato: item.celularContato ?? null,
            idProfissionalRealizaProcedimento:
              item.idProfissionalRealizaProcedimento ?? null,
            retorno: normalizarBoolean(item.retorno),
            localAgendamento: item.localAgendamento ?? null,
            criadoEm: item.criadoEm ?? null,
            atualizadoEm: item.atualizadoEm ?? null,
            usuarioCriacao: item.usuarioCriacao ?? null,
            usuarioUpdate: item.usuarioUpdate ?? null,
            prioridadePainel: item.prioridadePainel ?? null,
            cdPaciente: item.paciente?.cdPaciente ?? item.cdPaciente ?? null,
            procedimentos: item.procedimentos ?? [],
          }),
        );

      const consultasOrdenadas = ordenarPorHora(
        await preencherLocaisDasConsultas(consultasMapeadas),
      );

      if (consultasOrdenadas.length === 0) {
        setConsultas([]);
        setPacienteNome("");
        setConsultaSelecionadaId(null);
        setEtapaTela("cpf");
        limparEstadoTelaPersistido();
        await Swal.fire(
          "Nenhum atendimento",
          "Não encontramos consulta para hoje com esse CPF.",
          "info",
        );
        resetarTelaCpf();
        return;
      }

      const nomeBeneficiario =
        consultasOrdenadas[0]?.pacienteNome || "Beneficiário";
      setCpf(formatarCpf(cpfLimpo));
      setConsultas(consultasOrdenadas);
      setPacienteNome(nomeBeneficiario);
      setConsultaSelecionadaId(null);
      setEtapaTela("consultas");
      persistirTelaConsultas(cpfLimpo, nomeBeneficiario, consultasOrdenadas);
      return;

    } catch (error) {
      console.error("Erro ao buscar consultas do beneficiário:", error);
      await Swal.fire(
        "Erro",
        "Não foi possível localizar os atendimentos de hoje.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const marcarCompareceu = async (consulta: ConsultaAutoAtendimento) => {
    const confirmacao = await Swal.fire({
      title: "Confirmar comparecimento?",
      text: `Deseja marcar ${consulta.pacienteNome} como compareceu?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, confirmar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmacao.isConfirmed) return;

    try {
      await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
        statusAgendamento: "COMPARECEU",
      });

      atualizarConsultaLocal(consulta.idEvento, {
        statusAgendamento: "COMPARECEU",
      });

      persistirTelaConsultas(
        normalizarCpf(cpf),
        pacienteNome || consulta.pacienteNome,
        consultas.map((item) =>
          item.idEvento === consulta.idEvento ? { ...item, statusAgendamento: "COMPARECEU" } : item,
        ),
      );

      await Swal.fire("Sucesso", "Comparecimento registrado com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao marcar compareceu:", error);
      await Swal.fire("Erro", "Não foi possível atualizar o comparecimento.", "error");
    }
  };

  const abrirAutorizacaoComCompareceu = async (
    consulta: ConsultaAutoAtendimento,
    iniciarAutomaticamente = false,
  ) => {
    const statusAtual = String(consulta.statusAgendamento || "").toUpperCase();

    if (statusAtual !== "COMPARECEU") {
      try {
        await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
          statusAgendamento: "COMPARECEU",
        });

        atualizarConsultaLocal(consulta.idEvento, {
          statusAgendamento: "COMPARECEU",
        });
      } catch (error) {
        console.error("Erro ao atualizar comparecimento antes da autorização:", error);
        await Swal.fire(
          "Erro",
          "Não foi possível atualizar o comparecimento antes da autorização.",
          "error",
        );
        return;
      }
    }

    setIniciarAutorizacaoAutomaticamente(iniciarAutomaticamente);
    setConsultaAutorizacaoAberta({
      ...consulta,
      statusAgendamento: "COMPARECEU",
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eaf3ff_0%,#ffffff_28%,#eef6ff_100%)] text-slate-900">
      <main className="relative z-10 flex min-h-screen w-full flex-col">
        <div id="beneficiario-modal-root" className="pointer-events-none absolute inset-0 z-40 overflow-hidden" />

        <div className="w-full transition-all duration-200">


          {etapaTela === "cpf" && (
            <section className="w-full">
              <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-6 text-white md:px-8 md:py-8">
                <div className="mx-auto max-w-5xl px-2 md:px-3">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="text-center md:text-left">
                      <h2 className="text-[1.45rem] font-black tracking-tight text-white md:text-[2.2rem]">
                        Digite o seu CPF para começar
                      </h2>
                      <p className="mt-3 max-w-[34rem] text-[1rem] text-blue-100">
                        Digite o seu CPF para localizar seus agendamentos de hoje.
                      </p>
                    </div>
                    <div className="flex justify-center md:justify-end">
                      <p className="inline-flex min-h-9 items-center rounded-full border border-white/20 bg-white/10 px-4 text-[0.84rem] font-black uppercase tracking-[0.16em] text-white">

                        {`JOAO PESSOA - ${dataCabecalhoAtual}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 md:px-8 md:py-4">
                <div className="mx-auto max-w-5xl">
                  <div className="grid gap-3">
                    <div>
                      <label
                        htmlFor="beneficiario-cpf"
                        className="block text-center text-[2rem] font-black uppercase tracking-[0.16em] text-slate-600 md:text-[1.508rem]"

                      >
                        DIGITE O CPF DO BENEFICIÁRIO
                      </label>

                      <div className="mt-2 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                        <input
                          id="beneficiario-cpf"
                          type="text"
                          inputMode="numeric"
                          maxLength={14}
                          value={cpf}
                          onChange={handleCpfChange}
                          onFocus={() => setMostrarTecladoCpf(true)}
                          onClick={() => setMostrarTecladoCpf(true)}
                          onKeyDown={(event) => {
                            handleCpfKeyDown(event);
                            if (event.key === "Enter") {
                              void buscarConsultas();
                            }
                          }}
                          onPaste={handleCpfPaste}
                          placeholder="000.000.000-00"
                          pattern="[0-9]*"
                          className="h-[4rem] w-full border-0 bg-slate-50 px-4 text-center text-[1.2rem] font-black tracking-[0.12em] text-slate-900 outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00338d]/10 md:h-[4.35rem] md:text-[1.5rem]"
                        />
                      </div>
                    </div>

                    {mostrarTecladoCpf ? (
                      <div className="rounded-[1.1rem] border border-slate-200/80 bg-white/95 p-3 shadow-[0_18px_30px_rgba(15,23,42,0.08)] md:p-3.5">
                        <div className="mb-3 flex items-center justify-between px-1">
                          <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-slate-500">
                            Teclado numérico
                          </p>
                          <p className="text-[0.72rem] font-medium text-slate-400">
                            Toque para digitar
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 md:gap-3">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digito) => (
                            <button
                              key={`cpf-tecla-${digito}`}
                              type="button"
                              onClick={() => adicionarDigitoCpf(digito)}
                              className="flex h-12 items-center justify-center rounded-[0.95rem] border border-slate-200 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] text-[1rem] font-black text-white shadow-[0_10px_18px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_24px_rgba(15,23,42,0.18)] md:h-13 md:text-[1.12rem]"
                            >
                              {digito}
                            </button>
                          ))}


                          <button
                            type="button"
                            onClick={limparCpfDigitado}
                            className="flex h-12 items-center justify-center rounded-[0.95rem] border border-rose-200 bg-[linear-gradient(180deg,#fff7f8_0%,#ffe7eb_100%)] px-2 text-[0.62rem] font-black uppercase tracking-[0.05em] text-rose-700 shadow-[0_10px_16px_rgba(244,63,94,0.08)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 md:h-13 md:text-[0.68rem]"

                          >
                            Limpar CPF
                          </button>

                          <button
                            type="button"
                            onClick={() => adicionarDigitoCpf('0')}
                            className="flex h-12 items-center justify-center rounded-[0.95rem] border border-slate-200 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] text-[1rem] font-black text-white shadow-[0_10px_18px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_24px_rgba(15,23,42,0.18)] md:h-13 md:text-[1.12rem]"
                          >
                            0
                          </button>

                          <button
                            type="button"
                            onClick={apagarUltimoDigitoCpf}
                            className="flex h-12 items-center justify-center rounded-[0.95rem] border border-amber-200 bg-[linear-gradient(180deg,#fffdf2_0%,#fef0bf_100%)] px-2 text-[0.62rem] font-black uppercase tracking-[0.05em] text-amber-800 shadow-[0_10px_16px_rgba(245,158,11,0.08)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100 md:h-13 md:text-[0.68rem]"
                          >
                            Apagar
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => void buscarConsultas()}
                          disabled={loading || normalizarCpf(cpf).length < 11}
                          className="mt-3 flex h-12 w-full items-center justify-center rounded-[1rem] border border-blue-200/60 bg-[linear-gradient(135deg,#00338d_0%,#1d4ed8_48%,#38bdf8_100%)] px-5 text-[0.84rem] font-black uppercase tracking-[0.05em] text-white shadow-[0_16px_26px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_20px_32px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-[linear-gradient(135deg,#e5e7eb_0%,#cbd5e1_100%)] disabled:text-slate-600 disabled:shadow-none md:h-13 md:text-[0.88rem]"
                        >
                          {loading ? "Buscando..." : "Entrar"}
                        </button>
                      </div>
                    ) : null}

                  </div>
                </div>
              </div>
            </section>
          )}

          {etapaTela === "consultas" && (
            <>
              <section className="w-full">
                <div className="sticky top-0 z-30 w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-4 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-[linear-gradient(135deg,rgba(0,51,141,0.94)_0%,rgba(15,77,183,0.94)_52%,rgba(26,120,214,0.94)_100%)] md:px-8 md:py-5">
                  <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[minmax(0,1fr)_210px] md:items-center">
                    <div className="min-w-0 text-center md:text-left">
                      <p className="text-[0.74rem] font-bold uppercase tracking-[0.16em] text-blue-100/80">
                        Atendimentos do dia
                      </p>
                      <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">
                        {`Escolha o atendimento${dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----" ? ` - ${dataConsultasCabecalho}` : ""}`}
                      </h2>
                      <p className="mt-2.5 text-[1rem] font-black uppercase tracking-[0.06em] text-white md:text-[1.16rem]">
                        Beneficiário: {pacienteNome || "Beneficiário"}
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <button
                        onClick={() => void confirmarEncerramentoAutoAtendimento()}
                        className="h-10 rounded-[0.85rem] border border-red-300/35 bg-red-500/90 px-4 text-[0.78rem] font-bold text-white shadow-[0_8px_18px_rgba(127,29,29,0.16)] transition hover:bg-red-600"
                      >
                        Retorna ao menu inicial
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 md:px-8 md:py-4">
                  <div className="mx-auto max-w-6xl space-y-4">
                    <div className="rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[0.72rem] font-black uppercase tracking-[0.14em] text-[#00338d]">
                            Fluxo do atendimento
                          </p>
                          <p className="text-[0.98rem] font-black text-slate-900 md:text-[1.08rem]">
                            {consultaFluxoAtual ? `${consultaFluxoAtual.etapaAtual} de ${consultaFluxoAtual.total} agendamentos do dia` : "0 de 0 agendamentos do dia"}
                          </p>
                          <p className="text-[0.84rem] font-medium text-slate-600">
                            {consultaFluxoAtual?.autorizacaoConcluida
                              ? "Autoatendimento concluído. Próximo horário liberado."
                              : "Finalize o autoatendimento para liberar o próximo horário."}
                          </p>
                        </div>
                        <button
                          onClick={() => void buscarConsultas()}
                          disabled={loading}
                          className="h-10 rounded-[0.85rem] border border-slate-200 bg-white px-4 text-[0.76rem] font-bold text-[#00338d] shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-[#00338d]/25 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? "Atualizando..." : "Atualizar"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {consultaFluxoAtual ? (() => {
                        const { cardConsulta, consulta, tokenEnviado, autorizacaoConcluida } = consultaFluxoAtual;
                        const statusAtual = String(consulta.statusAgendamento || "").toUpperCase();
                        const faltouConsulta = statusAtual === "FALTOU";
                        const compareceuConsulta = statusAtual === "COMPARECEU";
                        const podeAutorizar = ["AGENDADO", "CONFIRMADO", "COMPARECEU"].includes(statusAtual);
                        const podeSeguir = podeAutorizar || tokenEnviado || autorizacaoConcluida;


                        return (
                          <article
                            key={cardConsulta.chave}
                            className={`border p-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition ${
                              autorizacaoConcluida
                                ? "border-emerald-200 bg-emerald-50/55 opacity-75"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 md:grid-cols-[54px_minmax(0,1fr)_54px] md:gap-3">
                              <button
                                type="button"
                                onClick={() => setIndiceConsultaAtual((valorAtual) => Math.max(valorAtual - 1, 0))}
                                disabled={indiceConsultaAtual === 0}
                                className={`flex h-11 w-11 items-center justify-center rounded-full border text-[1.15rem] font-black shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition md:h-12 md:w-12 md:text-[1.3rem] ${indiceConsultaAtual === 0 ? "border-slate-200 bg-white text-slate-300" : "border-blue-200/60 bg-[linear-gradient(135deg,#00338d_0%,#1d4ed8_58%,#38bdf8_100%)] text-white shadow-[0_10px_20px_rgba(0,51,141,0.16)] hover:brightness-105"} disabled:cursor-not-allowed disabled:shadow-none`}
                                aria-label="Voltar atendimento"
                              >
                                ‹
                              </button>

                              <div className="grid gap-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-h-8 min-w-[96px]">
                                    {(autorizacaoConcluida || (tokenEnviado && !autorizacaoConcluida)) && consulta.senhaPainel ? (
                                      <div className="inline-flex items-center rounded-[0.9rem] border border-emerald-200 bg-emerald-50 px-3 py-2 text-left shadow-[0_10px_18px_rgba(16,185,129,0.12)]">
                                        <span className="text-[0.98rem] font-black tracking-[0.04em] text-emerald-800 md:text-[1.08rem]">
                                          {`Senha: ${String(consulta.senhaPainel).toUpperCase()}`}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className={`inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 text-center text-[0.68rem] font-black uppercase tracking-[0.08em] shadow-[0_10px_18px_rgba(15,23,42,0.1)] ${faltouConsulta ? "border-red-200 bg-red-50 text-red-700" : tokenEnviado && !autorizacaoConcluida ? "border-amber-200 bg-amber-50 text-amber-800" : compareceuConsulta ? "border-orange-200 bg-orange-50 text-orange-700" : autorizacaoConcluida ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-[#00338d]"}`}>
                                    {!autorizacaoConcluida ? (
                                      <span
                                        aria-hidden="true"
                                        className={`inline-flex h-2.5 w-2.5 rounded-full ${faltouConsulta ? "bg-red-500" : tokenEnviado ? "bg-amber-500" : compareceuConsulta ? "bg-orange-500" : "bg-[#00338d]"}`}
                                      />
                                    ) : null}
                                    {autorizacaoConcluida ? (
                                      <span
                                        aria-hidden="true"
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[0.72rem] text-white"
                                      >
                                        ✓
                                      </span>
                                    ) : null}
                                    {faltouConsulta
                                      ? "Consulta não realizada"
                                      : tokenEnviado && !autorizacaoConcluida
                                        ? "Autorizado e token enviado para o celular"
                                        : autorizacaoConcluida
                                          ? "Autoatendimento concluído"
                                          : formatarStatus(consulta.statusAgendamento)}
                                  </p>
                                </div>

                                <div className="grid gap-2 text-center">
                                  {cardConsulta.agrupadoUltrassom ? (
                                    <p className="text-[1.45rem] font-black uppercase tracking-[0.08em] text-[#00338d] md:text-[1.8rem]">
                                      Horários do dia
                                    </p>
                                  ) : (
                                    <p className="text-[2.45rem] font-black tracking-tight text-[#00338d] md:text-[2.8rem]">
                                      {formatarHora(consulta.horaInicio)}
                                    </p>
                                  )}

                                  <div className={`border px-3 py-3 text-center ${autorizacaoConcluida ? "border-emerald-100 bg-white/70" : "border-slate-100 bg-slate-50"}`}>
                                    <p className="text-[0.9rem] font-bold uppercase tracking-[0.06em] text-slate-900">
                                      {consulta.profissionalNome}
                                    </p>
                                    <p className="mt-1 text-[0.84rem] text-slate-600">
                                      {consulta.especialidadeNome}
                                    </p>
                                  </div>

                                  {cardConsulta.agrupadoUltrassom ? (
                                    <div className={`border px-3 py-2.5 text-left ${autorizacaoConcluida ? "border-emerald-100 bg-white/70" : "border-blue-100 bg-blue-50/50"}`}>
                                      <div className="grid gap-1.5">
                                        {cardConsulta.consultasRelacionadas.map((item) => (
                                          <div
                                            key={item.idEvento}
                                            className="border-b border-blue-100/80 pb-1.5 last:border-b-0 last:pb-0"
                                          >
                                            <p className="text-[0.82rem] text-slate-700">
                                              <span className="font-black text-[#00338d]">
                                                {formatarHora(item.horaInicio)}
                                              </span>
                                              {" - "}
                                              {obterDescricaoProcedimentoConsulta(item)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                {autorizacaoConcluida ? null : podeSeguir ? (
                                  <button
                                    onClick={() => tokenEnviado && !autorizacaoConcluida ? void abrirValidacaoTokenDireta(consulta) : void abrirEtapaSenha(consulta)}
                                    className="h-12 bg-[#00338d] px-4 text-[0.88rem] font-black text-white shadow-[0_10px_20px_rgba(0,51,141,0.16)] transition hover:bg-[#00286f]"
                                  >
                                    {tokenEnviado && !autorizacaoConcluida ? "CONTINUAR TOKEN" : "SELECIONAR"}
                                  </button>
                                ) : (
                                  <div className={`flex h-12 items-center justify-center px-3 text-center text-[0.84rem] font-bold ${faltouConsulta ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                                    {faltouConsulta ? "Atendimento encerrado" : "Atendimento indisponível"}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setIndiceConsultaAtual((valorAtual) =>
                                    Math.min(valorAtual + 1, indiceMaximoLiberado),
                                  )
                                }
                                disabled={indiceConsultaAtual >= indiceMaximoLiberado}
                                className={`flex h-11 w-11 items-center justify-center rounded-full border text-[1.15rem] font-black shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition md:h-12 md:w-12 md:text-[1.3rem] ${indiceConsultaAtual >= indiceMaximoLiberado ? "border-slate-200 bg-white text-slate-300" : "border-blue-200/60 bg-[linear-gradient(135deg,#00338d_0%,#1d4ed8_58%,#38bdf8_100%)] text-white shadow-[0_10px_20px_rgba(0,51,141,0.16)] hover:brightness-105"} disabled:cursor-not-allowed disabled:shadow-none`}
                                aria-label="Próximo atendimento"
                              >
                                ›
                              </button>
                            </div>
                          </article>
                        );
                      })() : null}

                    </div>
                  </div>
                </div>
            </section>
            </>
          )}

          {etapaTela === "senha" && consultaSelecionada && (
            <section className="w-full">
              <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-5 text-white md:px-8 md:py-7">
                <div className="mx-auto max-w-6xl text-center md:text-left">
                  <div className="text-center md:text-left">
                    <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">
                      AUTORIZAÇÃO
                    </h2>                    
                    <p className="mt-2 text-[0.95rem] text-blue-100">
                      Confira o atendimento. A senha do painel será gerada e vinculada automaticamente antes de seguir, para autorização.
                    </p>
                       <p className="mt-2.5 text-[1rem] font-black uppercase tracking-[0.06em] text-white md:text-[1.16rem]">
                        Beneficiário: {pacienteNome || "Beneficiário"}
                      </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-5 md:px-8 md:py-6">
                <div className="mx-auto max-w-5xl space-y-4">
                  <AtendimentoResumoCard
                    data={formatarData(consultaSelecionada.dataInicio)}
                    hora={formatarHora(consultaSelecionada.horaInicio)}
                    profissionalNome={consultaSelecionada.profissionalNome}
                    especialidadeNome={consultaSelecionada.especialidadeNome}
                    localidadePainel={consultaSelecionada.localidadePainel}
                    senhaPainel={consultaSelecionada.senhaPainel}
                    senhaPainelDigitada={senhasPainelDigitadas[consultaSelecionada.idEvento] ?? ""}
                    onSenhaPainelChange={(value) =>
                      atualizarTextoSenhaPainel(consultaSelecionada.idEvento, value)
                    }
                  />

                  <div className="grid gap-3">
                    {!consultaSelecionada.autorizado && !consultaSelecionada.tokenValidado && (
                      <button
                        onClick={() => void vincularSenhaPainel(consultaSelecionada)}
                        className="h-16 bg-[#00338d] px-5 text-[0.95rem] font-black text-white transition hover:bg-[#00286f]"
                      >
                        {consultaSelecionada.senhaPainel ? "SEGUIR ATENDIMENTO" : "VINCULAR SENHA"}
                      </button>
                    )}

                    {consultaSelecionada.autorizado && !consultaSelecionada.tokenValidado ? (
                      <button
                        onClick={() => void abrirValidacaoTokenDireta(consultaSelecionada)}
                        className="h-14 border border-amber-500 bg-amber-100 px-5 text-[0.9rem] font-black text-amber-900 shadow-[0_10px_24px_rgba(217,119,6,0.18)] transition hover:bg-amber-200"
                      >
                        CONFIRMAR TOKEN
                      </button>
                    ) : consultaSelecionada.autorizado && consultaSelecionada.tokenValidado ? (
                      <div className="flex h-14 items-center justify-center bg-emerald-600 px-5 text-[0.9rem] font-black text-white">
                        AUTORIZAÇÃO CONCLUÍDA
                      </div>
                    ) : null}

                    <button
                      onClick={voltarParaConsultas}
                      className="h-14 border border-red-200 bg-red-50 px-5 text-[0.88rem] font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 hover:text-red-800"
                    >
                      SAIR
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {consultaAutorizacaoAberta && (
          <ModalAutorizacaoBeneficiario
            consulta={consultaAutorizacaoAberta}
            onClose={() => {
              setConsultaAutorizacaoAberta(null);
              setIniciarAutorizacaoAutomaticamente(false);
            }}
            onAfterFlow={() => buscarConsultas()}
            iniciarAutomaticamente={iniciarAutorizacaoAutomaticamente}
          />
        )}
      </main>

    </div>
  );
};

export default BeneficiarioAutoAtendimento;





















































