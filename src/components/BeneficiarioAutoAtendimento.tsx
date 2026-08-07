"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import Swal from "sweetalert2";
import {
  FaBriefcaseMedical,
  FaClinicMedical,
  FaClipboardList,
  FaHandPointer,
  FaHeartbeat,
  FaNotesMedical,
  FaShieldAlt,
  FaStethoscope,
  FaUserCircle,
  FaUserMd,
} from "react-icons/fa";
import AtendimentoResumoCard from "./AtendimentoResumoCard";
import { TokenEnviar } from "./TokenEnviar";
import { TokenValidar } from "./TokenValidar";
import ConsultasHeader from "./beneficiario/ConsultasHeader";
import CpfTecladoNumerico from "./beneficiario/CpfTecladoNumerico";
import SessaoExpiracaoCard from "./beneficiario/SessaoExpiracaoCard";
import AutorizacaoPreparandoCard from "./beneficiario/AutorizacaoPreparandoCard";
import TokenInlinePanel from "./beneficiario/TokenInlinePanel";
import ConsultaFluxoNavegacao from "./beneficiario/ConsultaFluxoNavegacao";
import SenhaAutorizacaoAcoes from "./beneficiario/SenhaAutorizacaoAcoes";
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
  erroAutorizacao?: boolean; // NOVO
  mensagemErroAutorizacao?: string; // NOVO
}

interface ConsultaCardAgrupado {
  chave: string;
  consultaBase: ConsultaAutoAtendimento;
  consultasRelacionadas: ConsultaAutoAtendimento[];
  agrupadoUltrassom: boolean;
}

const normalizarCpf = (valor?: string) =>
  String(valor || "").replace(/\D/g, "");

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

const normalizarBoolean = (valor: unknown) => {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase();
  if (texto === "1" || texto === "true") return true;
  if (texto === "0" || texto === "false") return false;
  return Boolean(valor);
};

const formatarHora = (hora?: string) =>
  String(hora || "").slice(0, 5) || "--:--";

const formatarStatus = (status?: string) => {
  const statusSeguro = String(status || "").trim();
  return statusSeguro || "N\u00c3O INFORMADO";
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

const formatarHoraAtual = () => {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

const TEMPO_INATIVIDADE_MS = 60 * 1000;
const CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS = 20;
const CONTAGEM_ENCERRAMENTO_AUTOMATICO_SEGUNDOS = 0;
const BLOQUEIO_REENVIO_TOKEN_MS = 23 * 1000;

const ordenarPorHora = (consultas: ConsultaAutoAtendimento[]) =>
  [...consultas].sort((a, b) =>
    String(a.horaInicio || "").localeCompare(String(b.horaInicio || "")),
  );

const converterHoraParaMinutos = (hora?: string | null) => {
  const horaFormatada = String(hora || "").trim();
  if (!horaFormatada) return null;

  const partes = horaFormatada.split(":");
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;

  return horas * 60 + minutos;
};

const LIMITE_INTERVALO_ULTRASSOM_MINUTOS = 60;

const ehMedicoUltrassonografista = (consulta: ConsultaAutoAtendimento) =>
  String(consulta.especialidadeNome || "")
    .trim()
    .toUpperCase()
    .includes("MEDICO ULTRASSONOGRAFISTA");

const obterExecutanteConsulta = (consulta: ConsultaAutoAtendimento) =>
  String(
    consulta.idProfissionalRealizaProcedimento || consulta.idProfissional || "",
  );

const obterFaixaHorariosConsultas = (consultas: ConsultaAutoAtendimento[]) => {
  if (!consultas.length) return "";

  const consultasOrdenadas = [...consultas].sort((a, b) =>
    String(a.horaInicio || "").localeCompare(String(b.horaInicio || "")),
  );

  const primeiraConsulta = consultasOrdenadas[0];
  const ultimaConsulta = consultasOrdenadas[consultasOrdenadas.length - 1];
  const horarioInicial = formatarHora(primeiraConsulta?.horaInicio);
  const horarioFinal = formatarHora(ultimaConsulta?.horaInicio);

  if (!horarioInicial) return "";
  if (!horarioFinal || horarioFinal === horarioInicial) return horarioInicial;

  return `${horarioInicial} at\u00e9 ${horarioFinal}`;
};

const criarEventoBaseDaConsulta = (
  consulta: ConsultaAutoAtendimento,
): AgendaEvento => ({
  idEvento: Number(consulta.idEvento),
  horaInicio: String(consulta.horaInicio || ""),
  horaFim: String(consulta.horaFim || consulta.horaInicio || ""),
  descricaoEvento: String(
    consulta.descricaoEvento || consulta.nomeEvento || "",
  ),
  categoria: String(consulta.categoria || "CONSULTA"),
  nomeEvento: String(
    consulta.nomeEvento || consulta.descricaoEvento || "CONSULTA",
  ),
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
  procedimentos: Array.isArray(consulta.procedimentos)
    ? consulta.procedimentos
    : [],
  idProfissionalRealizaProcedimento:
    consulta.idProfissionalRealizaProcedimento || undefined,
});

interface ModalAutorizacaoProps {
  consulta: ConsultaAutoAtendimento;
  onClose: () => void;
  onAfterFlow: () => Promise<void>;
  iniciarAutomaticamente?: boolean;
  abrirTokenInlineAposEnvio?: boolean;
}

const ModalAutorizacaoBeneficiario: React.FC<ModalAutorizacaoProps> = ({
  consulta,
  onClose,
  onAfterFlow,
  iniciarAutomaticamente = false,
  abrirTokenInlineAposEnvio = false,
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
        "Aten\u00e7\u00e3o",
        "N\u00e3o foi poss\u00edvel identificar o profissional desse atendimento.",
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
        "Aguarde a agenda completa carregar antes de iniciar a autoriza\u00e7\u00e3o.",
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
            <h2 className="text-[1.45rem] font-black tracking-tight">
              {"Autoriza\u00e7\u00e3o TISS SADT"}
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
                  {consulta.nrCarteiraPlano || "N\u00e3o informada"}
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
                <div className="text-[0.72rem] text-slate-300">
                  Profissional
                </div>
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
              {loading
                ? "Carregando agenda..."
                : "Iniciar Autoriza\u00e7\u00e3o"}
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

type TokenFeedbackInline = {
  tipo: "info" | "success" | "error";
  mensagem: string;
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
      pacienteNome:
        typeof estado.pacienteNome === "string" ? estado.pacienteNome : "",
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

const toSafeTokenString = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(
      obj.value ?? obj.codigo ?? obj.id ?? obj.numero ?? obj.sigla ?? "",
    ).trim();
  }
  return String(value).trim();
};

const toSafeTokenNumber = (value: unknown) => {
  const normalized = toSafeTokenString(value);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
};

const resolveNumeroGuiaOperadoraInline = (
  senhaGuia: unknown,
  numeroGuiaOperadora: unknown,
) => {
  const numeroDireto = toSafeTokenNumber(numeroGuiaOperadora);
  if (numeroDireto > 0) return numeroDireto;

  const senhaComoNumero = toSafeTokenNumber(senhaGuia);
  if (senhaComoNumero > 0) return senhaComoNumero;

  return 0;
};

const possuiGuiaGerada = (numeroGuiaGerado: unknown) =>
  numeroGuiaGerado != null && String(numeroGuiaGerado).trim() !== "";

const possuiSenhaAutorizacao = (senhaAutorizacao: unknown) =>
  senhaAutorizacao != null && String(senhaAutorizacao).trim() !== "";

const extrairRetornoApiToken = (data: any) => ({
  status: toSafeTokenString(data?.status),
  mensagem: toSafeTokenString(data?.mensagem || data?.message || data?.error),
});

const normalizarMensagemTokenInline = (mensagem?: string) => {
  const texto = toSafeTokenString(mensagem);
  const textoLower = texto.toLowerCase();

  if (
    textoLower.includes("token invalido") ||
    textoLower.includes("token inv\u00e1lido") ||
    textoLower.includes("ora-20400")
  ) {
    return "Token errado. Insira um token correto.";
  }
  return texto;
};

const BeneficiarioAutoAtendimento: React.FC = () => {
  const locaisProfissionaisPorDataCacheRef = useRef<
    Record<string, Promise<LocalProfissionalDia[]>>
  >({});
  const inputCpfRef = useRef<HTMLInputElement | null>(null);
  const [hidratado, setHidratado] = useState(false);
  const [cpf, setCpf] = useState("");
  const [pacienteNome, setPacienteNome] = useState("");
  const [consultas, setConsultas] = useState<ConsultaAutoAtendimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultaProcessandoSenhaId, setConsultaProcessandoSenhaId] = useState<
    number | null
  >(null);
  const [consultaAutorizacaoAberta, setConsultaAutorizacaoAberta] =
    useState<ConsultaAutoAtendimento | null>(null);
  const [
    iniciarAutorizacaoAutomaticamente,
    setIniciarAutorizacaoAutomaticamente,
  ] = useState(false);
  const [senhasPainelDigitadas, setSenhasPainelDigitadas] = useState<
    Record<number, string>
  >({});
  const [consultaSelecionadaId, setConsultaSelecionadaId] = useState<
    number | null
  >(null);
  const [indiceConsultaAtual, setIndiceConsultaAtual] = useState(0);
  const [etapaTela, setEtapaTela] = useState<EtapaTelaAutoAtendimento>("cpf");
  const [mostrarTelaBoasVindasCpf, setMostrarTelaBoasVindasCpf] =
    useState(true);
  const [animandoSaidaTelaBoasVindasCpf, setAnimandoSaidaTelaBoasVindasCpf] =
    useState(false);
  const [mostrarTecladoCpf, setMostrarTecladoCpf] = useState(false);
  const [horaCabecalhoAtual, setHoraCabecalhoAtual] = useState(() =>
    formatarHoraAtual(),
  );
  const [abrirTokenInlineAposEnvio, setAbrirTokenInlineAposEnvio] =
    useState(false);
  const [consultaTokenAbertaId, setConsultaTokenAbertaId] = useState<
    number | null
  >(null);
  const [tokenDigitadoPorConsulta, setTokenDigitadoPorConsulta] = useState<
    Record<number, string>
  >({});
  const [, setTokenErroPorConsulta] = useState<Record<number, string>>({});
  const [, setTokenFeedbackPorConsulta] = useState<
    Record<number, TokenFeedbackInline | undefined>
  >({});
  const [consultaReenviandoTokenId, setConsultaReenviandoTokenId] = useState<
    number | null
  >(null);
  const [consultaValidandoTokenId, setConsultaValidandoTokenId] = useState<
    number | null
  >(null);
  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<
    number | null
  >(null);
  const [bloqueioReenvioAtePorConsulta, setBloqueioReenvioAtePorConsulta] =
    useState<Record<number, number>>({});
  const [agoraReenvioToken, setAgoraReenvioToken] = useState(() => Date.now());
  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);

  const [segundosRestantesInatividade, setSegundosRestantesInatividade] =
    useState(CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS);
  const timeoutInatividadeRef = useRef<number | null>(null);
  const intervaloSessaoRef = useRef<number | null>(null);
  const intervaloModalInatividadeRef = useRef<number | null>(null);
  const expiracaoSessaoRef = useRef(Date.now() + TEMPO_INATIVIDADE_MS);
  const pausaInatividadeRef = useRef(false);

  const consultaSelecionada =
    consultas.find((consulta) => consulta.idEvento === consultaSelecionadaId) ||
    null;

  const cardsConsultas = useMemo<ConsultaCardAgrupado[]>(() => {
    const cards: ConsultaCardAgrupado[] = [];
    const mapaEventos = new Map<string, ConsultaCardAgrupado>();
    const mapaUltrassom = new Map<string, ConsultaAutoAtendimento[]>();

    consultas.forEach((consulta) => {
      if (!ehMedicoUltrassonografista(consulta)) {
        mapaEventos.set(`evento::${consulta.idEvento}`, {
          chave: `evento::${consulta.idEvento}`,
          consultaBase: consulta,
          consultasRelacionadas: [consulta],
          agrupadoUltrassom: false,
        });
        return;
      }

      const chaveUltrassom = [
        normalizarCpf(consulta.nuCpf),
        String(consulta.dataInicio || "").split("T")[0],
        obterExecutanteConsulta(consulta),
      ].join("::");

      const agrupadas = mapaUltrassom.get(chaveUltrassom) || [];
      agrupadas.push(consulta);
      mapaUltrassom.set(chaveUltrassom, agrupadas);
    });

    cards.push(...Array.from(mapaEventos.values()));

    mapaUltrassom.forEach((consultasAgrupadas, chaveBase) => {
      const consultasOrdenadas = ordenarPorHora(consultasAgrupadas);
      let blocoAtual: ConsultaAutoAtendimento[] = [];
      let indiceBloco = 0;

      consultasOrdenadas.forEach((consultaAtual, indiceAtual) => {
        if (blocoAtual.length === 0) {
          blocoAtual = [consultaAtual];
        } else {
          const ultimaDoBloco = blocoAtual[blocoAtual.length - 1];
          const minutosAtual = converterHoraParaMinutos(
            consultaAtual.horaInicio,
          );
          const minutosUltimo = converterHoraParaMinutos(
            ultimaDoBloco.horaInicio,
          );
          const diferencaMinutos =
            minutosAtual !== null && minutosUltimo !== null
              ? minutosAtual - minutosUltimo
              : 0;

          if (diferencaMinutos > LIMITE_INTERVALO_ULTRASSOM_MINUTOS) {
            cards.push({
              chave: `${chaveBase}::bloco::${indiceBloco}`,
              consultaBase: blocoAtual[0],
              consultasRelacionadas: blocoAtual,
              agrupadoUltrassom: true,
            });
            indiceBloco += 1;
            blocoAtual = [consultaAtual];
          } else {
            blocoAtual.push(consultaAtual);
          }
        }

        if (
          indiceAtual === consultasOrdenadas.length - 1 &&
          blocoAtual.length > 0
        ) {
          cards.push({
            chave: `${chaveBase}::bloco::${indiceBloco}`,
            consultaBase: blocoAtual[0],
            consultasRelacionadas: blocoAtual,
            agrupadoUltrassom: true,
          });
        }
      });
    });

    return cards.sort((a, b) =>
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
        const guiaGerada = possuiGuiaGerada(consulta.numeroGuiaGerado);
        const senhaAutorizacaoPreenchida = possuiSenhaAutorizacao(
          consulta.senhaAutorizacao,
        );

        return {
          cardConsulta,
          consulta,
          indice,
          etapaAtual: indice + 1,
          total: cardsConsultas.length,
          autorizado,
          tokenValidado,
          guiaGerada,
          senhaAutorizacaoPreenchida,
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
        maiorIndiceLiberado = Math.min(
          indice + 1,
          cardsConsultasFluxo.length - 1,
        );
      }
    });

    return maiorIndiceLiberado;
  }, [cardsConsultasFluxo]);

  const consultaFluxoAtual = cardsConsultasFluxo[indiceConsultaAtual] || null;
  const possuiModalAbertoQuePausaInatividade = Boolean(
    // Pausa apenas em modais realmente bloqueantes. Teclados virtuais
    // continuam contando inatividade para que o aviso de expiração apareça.
    consultaAutorizacaoAberta,
  );

  const dataConsultasCabecalho = useMemo(
    () => formatarData(cardsConsultas[0]?.consultaBase.dataInicio),
    [cardsConsultas],
  );
  const dataCabecalhoAtual = useMemo(() => formatarDataAtual(), []);

  const formatarTempoSessao = (segundos: number) => {
    const totalSegundos = Math.max(0, segundos);
    const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
    const segundosRestantes = String(totalSegundos % 60).padStart(2, "0");
    return `${minutos}:${segundosRestantes}`;
  };

  const limparTemporizadoresSessao = () => {
    if (timeoutInatividadeRef.current) {
      window.clearTimeout(timeoutInatividadeRef.current);
      timeoutInatividadeRef.current = null;
    }

    if (intervaloSessaoRef.current) {
      window.clearInterval(intervaloSessaoRef.current);
      intervaloSessaoRef.current = null;
    }

    if (intervaloModalInatividadeRef.current) {
      window.clearInterval(intervaloModalInatividadeRef.current);
      intervaloModalInatividadeRef.current = null;
    }
  };

  const encerrarSessaoPorInatividade = () => {
    limparTemporizadoresSessao();
    setMostrarModalInatividade(false);
    setSegundosRestantesInatividade(CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS);

    resetarTelaCpf();
  };

  const reiniciarTemporizadorSessao = () => {
    if (!hidratado) return;

    limparTemporizadoresSessao();
    setMostrarModalInatividade(false);
    setSegundosRestantesInatividade(CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS);

    if (etapaTela === "cpf") {
      return;
    }

    expiracaoSessaoRef.current = Date.now() + TEMPO_INATIVIDADE_MS;

    intervaloSessaoRef.current = window.setInterval(() => {
      const devePausarInatividade =
        pausaInatividadeRef.current || Swal.isVisible();

      if (devePausarInatividade) {
        expiracaoSessaoRef.current += 1000;
        setMostrarModalInatividade(false);
        setSegundosRestantesInatividade(
          CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS,
        );
        return;
      }

      const restante = Math.max(
        0,
        Math.ceil((expiracaoSessaoRef.current - Date.now()) / 1000),
      );

      if (restante <= CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS) {
        setMostrarModalInatividade(true);
        setSegundosRestantesInatividade(restante);
      } else {
        setMostrarModalInatividade(false);
        setSegundosRestantesInatividade(CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS);
      }

      if (restante <= CONTAGEM_ENCERRAMENTO_AUTOMATICO_SEGUNDOS) {
        encerrarSessaoPorInatividade();
      }
    }, 1000);
  };

  useEffect(() => {
    setHoraCabecalhoAtual(formatarHoraAtual());
    const intervaloHora = window.setInterval(() => {
      setHoraCabecalhoAtual(formatarHoraAtual());
    }, 60000);

    return () => window.clearInterval(intervaloHora);
  }, []);

  useEffect(() => {
    const existeBloqueioAtivo = Object.values(
      bloqueioReenvioAtePorConsulta,
    ).some((tempo) => tempo > Date.now());

    if (!existeBloqueioAtivo) return;

    setAgoraReenvioToken(Date.now());
    const intervaloReenvio = window.setInterval(() => {
      setAgoraReenvioToken(Date.now());
    }, 1000);

    return () => window.clearInterval(intervaloReenvio);
  }, [bloqueioReenvioAtePorConsulta]);

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
  useEffect(() => {
    if (etapaTela !== "consultas" || !consultaFluxoAtual) return;

    if (
      !consultaFluxoAtual.autorizado ||
      consultaFluxoAtual.autorizacaoConcluida
    ) {
      return;
    }

    const idEventoAtual = consultaFluxoAtual.consulta.idEvento;

    setBloqueioReenvioAtePorConsulta((prev) => {
      if ((prev[idEventoAtual] || 0) > Date.now()) {
        return prev;
      }

      return {
        ...prev,
        [idEventoAtual]: Date.now() + BLOQUEIO_REENVIO_TOKEN_MS,
      };
    });
  }, [
    etapaTela,
    consultaFluxoAtual?.consulta.idEvento,
    consultaFluxoAtual?.autorizado,
    consultaFluxoAtual?.autorizacaoConcluida,
  ]);

  useEffect(() => {
    pausaInatividadeRef.current = possuiModalAbertoQuePausaInatividade;

    if (possuiModalAbertoQuePausaInatividade) {
      setMostrarModalInatividade(false);
      setSegundosRestantesInatividade(
        CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS,
      );
    }
  }, [possuiModalAbertoQuePausaInatividade]);

  useEffect(() => {
    if (!hidratado) return;

    if (etapaTela === "cpf") {
      limparTemporizadoresSessao();
      setMostrarModalInatividade(false);
      setSegundosRestantesInatividade(
        CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS,
      );
      return;
    }

    reiniciarTemporizadorSessao();

    const handleAtividadeUsuario = () => {
      reiniciarTemporizadorSessao();
    };

    window.addEventListener("pointerdown", handleAtividadeUsuario);
    window.addEventListener("touchstart", handleAtividadeUsuario);
    window.addEventListener("keydown", handleAtividadeUsuario);

    return () => {
      window.removeEventListener("pointerdown", handleAtividadeUsuario);
      window.removeEventListener("touchstart", handleAtividadeUsuario);
      window.removeEventListener("keydown", handleAtividadeUsuario);
      limparTemporizadoresSessao();
    };
  }, [
    hidratado,
    etapaTela,
    indiceConsultaAtual,
    consultaTokenAbertaId,
    consultaProcessandoSenhaId,
    consultaTecladoTokenId,
  ]);

  if (!hidratado) {
    return null;
  }

  const persistirTelaConsultas = (
    cpfAtual: string,
    nomeAtual: string,
    consultasAtuais: ConsultaAutoAtendimento[],
  ) => {
    salvarEstadoTelaPersistido({
      cpf: formatarCpf(cpfAtual),
      pacienteNome: nomeAtual,
      consultas: consultasAtuais,
      etapaTela: "consultas",
    });
  };

  const resetarTelaCpf = () => {
    limparTemporizadoresSessao();
    setMostrarModalInatividade(false);
    setSegundosRestantesInatividade(CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS);

    setCpf("");
    setPacienteNome("");
    setConsultas([]);
    setConsultaAutorizacaoAberta(null);
    setIniciarAutorizacaoAutomaticamente(false);
    setConsultaSelecionadaId(null);
    setIndiceConsultaAtual(0);
    setMostrarTelaBoasVindasCpf(true);
    setAnimandoSaidaTelaBoasVindasCpf(false);
    setSenhasPainelDigitadas({});
    setMostrarTecladoCpf(false);
    setConsultaTokenAbertaId(null);
    setConsultaProcessandoSenhaId(null);
    setConsultaReenviandoTokenId(null);
    setConsultaValidandoTokenId(null);
    setConsultaTecladoTokenId(null);
    setBloqueioReenvioAtePorConsulta({});
    setTokenDigitadoPorConsulta({});
    setTokenErroPorConsulta({});
    setTokenFeedbackPorConsulta({});
    setEtapaTela("cpf");
    limparEstadoTelaPersistido();
  };
  const atualizarTextoSenhaPainel = (idEvento: number, valor: string) => {
    setSenhasPainelDigitadas((prev) => ({
      ...prev,
      [idEvento]: String(valor || "").toUpperCase(),
    }));
  };

  const limparMensagemTokenInline = (idEvento: number) => {
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [idEvento]: "",
    }));
    setTokenFeedbackPorConsulta((prev) => ({
      ...prev,
      [idEvento]: undefined,
    }));
  };

  const atualizarFeedbackTokenInline = (
    idEvento: number,
    tipo: TokenFeedbackInline["tipo"],
    mensagem: string,
  ) => {
    setTokenFeedbackPorConsulta((prev) => ({
      ...prev,
      [idEvento]: { tipo, mensagem },
    }));
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [idEvento]: "",
    }));
  };

  const focarCampoTokenInline = (idEvento: number, indice: number) => {
    if (typeof document === "undefined") return;
    const target = document.getElementById(
      `token-inline-${idEvento}-${indice}`,
    ) as HTMLInputElement | null;
    target?.focus();
    target?.select();
  };

  const abrirTecladoTokenInline = (idEvento: number, indice = 0) => {
    setConsultaTecladoTokenId(idEvento);
    setTimeout(() => focarCampoTokenInline(idEvento, indice), 0);
  };

  const fecharTecladoTokenInline = () => {
    setConsultaTecladoTokenId(null);
  };

  const atualizarTokenDigitadoInline = (
    idEvento: number,
    indice: number,
    valor: string,
  ) => {
    const digito = valor.replace(/\D/g, "").slice(-1);

    setTokenDigitadoPorConsulta((prev) => {
      const atual = Array.from(
        { length: 4 },
        (_, posicao) => prev[idEvento]?.[posicao] || "",
      );
      atual[indice] = digito;
      return {
        ...prev,
        [idEvento]: atual.join("").slice(0, 4),
      };
    });

    limparMensagemTokenInline(idEvento);

    if (digito && indice < 3) {
      setTimeout(() => focarCampoTokenInline(idEvento, indice + 1), 0);
    }
  };

  const handleTokenInlineKeyDown = (
    idEvento: number,
    indice: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const tokenAtual = tokenDigitadoPorConsulta[idEvento] || "";

      if (tokenAtual[indice]) {
        atualizarTokenDigitadoInline(idEvento, indice, "");
        return;
      }

      if (indice > 0) {
        atualizarTokenDigitadoInline(idEvento, indice - 1, "");
        setTimeout(() => focarCampoTokenInline(idEvento, indice - 1), 0);
      }
      return;
    }

    if (event.key === "ArrowLeft" && indice > 0) {
      event.preventDefault();
      focarCampoTokenInline(idEvento, indice - 1);
      return;
    }

    if (event.key === "ArrowRight" && indice < 3) {
      event.preventDefault();
      focarCampoTokenInline(idEvento, indice + 1);
      return;
    }

    if (event.key === "Tab") {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleTokenInlinePaste = (
    idEvento: number,
    event: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    event.preventDefault();
    const numeros = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    setTokenDigitadoPorConsulta((prev) => ({
      ...prev,
      [idEvento]: numeros,
    }));
    limparMensagemTokenInline(idEvento);
    const ultimoIndice = Math.min(Math.max(numeros.length - 1, 0), 3);
    setTimeout(() => focarCampoTokenInline(idEvento, ultimoIndice), 0);
  };

  const finalizarFluxoTokenInline = async (idEvento: number) => {
    await buscarConsultas();

    setConsultaProcessandoSenhaId(null);
    setConsultaTokenAbertaId(idEvento);
    setBloqueioReenvioAtePorConsulta((prev) => ({
      ...prev,
      [idEvento]: prev[idEvento] || Date.now() + BLOQUEIO_REENVIO_TOKEN_MS,
    }));
    setAbrirTokenInlineAposEnvio(false);
  };

  const reenviarTokenInline = async (consulta: ConsultaAutoAtendimento) => {
    const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
    const numeroGuiaOperadora = Number(
      consulta.numeroGuiaOperadora || consulta.senhaAutorizacao || 0,
    );

    if (!senhaGuia) {
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]:
          "N\u00e3o encontramos a senha da guia para reenviar o token.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "N\u00e3o encontramos a senha da guia para reenviar o token.",
      );
    }

    limparMensagemTokenInline(consulta.idEvento);
    setConsultaReenviandoTokenId(consulta.idEvento);

    try {
      const reenviado = await TokenEnviar({
        nome: consulta.pacienteNome,
        nrCarteiraPlano: consulta.nrCarteiraPlano,
        senhaGuia,
        numeroGuiaGerado: consulta.numeroGuiaGerado || undefined,
        numeroGuiaOperadora,
        isReenvio: true,
        silencioso: true,
      });

      if (reenviado === false) {
        setTokenErroPorConsulta((prev) => ({
          ...prev,
          [consulta.idEvento]:
            "N\u00e3o foi poss\u00edvel reenviar o token agora.",
        }));
        await exibirModalErroTokenInline(
          consulta.idEvento,
          "N\u00e3o foi poss\u00edvel reenviar o token agora.",
        );
        return;
      }

      setBloqueioReenvioAtePorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: Date.now() + BLOQUEIO_REENVIO_TOKEN_MS,
      }));

      atualizarFeedbackTokenInline(
        consulta.idEvento,
        "success",
        "Token reenviado com sucesso. Veja o novo c\u00f3digo no celular.",
      );
      await Swal.fire({
        title: "TOKEN REENVIADO",
        text: "Um novo c\u00f3digo foi enviado para o seu celular, pelo aplicativo ou por SMS.",
        icon: "success",
        confirmButtonText: "Fechar",
        allowOutsideClick: false,
        background: "#ffffff",
        color: "#0f172a",
        customClass: {
          popup: "!rounded-[1.2rem] !px-6 !py-5",
          title: "!text-[1.5rem] !font-black !text-emerald-700",
          confirmButton:
            "!bg-emerald-600 !text-white !font-black !rounded-[0.9rem] !px-6 !py-3",
        },
      });
    } catch (_error) {
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]:
          "N\u00e3o foi poss\u00edvel reenviar o token agora.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "N\u00e3o foi poss\u00edvel reenviar o token agora.",
      );
    } finally {
      setConsultaReenviandoTokenId(null);
    }
  };

  const exibirModalErroTokenInline = async (
    idEvento: number,
    mensagem: string,
  ) => {
  const mensagemNormalizada = String(mensagem || "").trim();
  const titulo =
      mensagemNormalizada.toLowerCase() ===
        "token errado. insira um token correto." ||
      mensagemNormalizada.toLowerCase() === "token inv\u00e1lido" ||
      mensagemNormalizada.toLowerCase() === "token invalido"
        ? "TOKEN INV\u00c1LIDO"
        : "ERRO AO VALIDAR TOKEN";

    await Swal.fire({
      title: titulo,
      text:
        titulo === "TOKEN INV\u00c1LIDO"
          ? "Token errado. Insira um token correto."
          : mensagemNormalizada ||
            "N\u00e3o foi poss\u00edvel validar o token.",
      icon: "error",
      confirmButtonText: "FECHAR",
      allowOutsideClick: false,
      background: "#ffffff",
      color: "#0f172a",
      customClass: {
        popup: "!rounded-[1.2rem] !px-6 !py-5",
        title: "!text-[1.4rem] !font-black !text-red-700",
        confirmButton:
          "!bg-red-600 !text-white !font-black !rounded-[0.9rem] !px-6 !py-3",
      },
    });

    setTimeout(() => focarCampoTokenInline(idEvento, 0), 0);
  };

  const exibirModalSucessoELiberarConsulta = async (consulta: ConsultaAutoAtendimento) => {
  await Swal.fire({
    title: "✅ ATENDIMENTO LIBERADO!",
    html: `
      <div style="text-align: left; padding: 8px 0;">
        <p style="font-size: 1.1rem; margin-bottom: 8px;"><strong>${consulta.pacienteNome}</strong></p>
        <p style="color: #475569; margin-bottom: 4px;">📋 ${consulta.profissionalNome}</p>
        <p style="color: #475569; margin-bottom: 4px;">🏥 ${consulta.especialidadeNome}</p>
        <p style="color: #00338d; font-weight: bold; font-size: 1.2rem; margin-top: 8px;">
          🕐 ${formatarHora(consulta.horaInicio)}
        </p>
        <p style="color: #16a34a; font-weight: bold; margin-top: 8px;">
          ✅ Token validado com sucesso!
        </p>
        <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">
          Aguarde ser chamado(a) no painel.
        </p>
      </div>
    `,
    icon: "success",
    confirmButtonText: "OK, ENTENDI",
    allowOutsideClick: false,
    background: "#ffffff",
    color: "#0f172a",
    customClass: {
      popup: "!rounded-[1.2rem] !px-6 !py-5",
      title: "!text-[1.5rem] !font-black !text-emerald-700",
      confirmButton: "!bg-emerald-600 !text-white !font-black !rounded-[0.9rem] !px-6 !py-3",
    },
  });
};

const validarTokenInline = async (consulta: ConsultaAutoAtendimento) => {
  const token = String(
    tokenDigitadoPorConsulta[consulta.idEvento] || "",
  ).replace(/\D/g, "");
  const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
  const numeroGuiaOperadora = resolveNumeroGuiaOperadoraInline(
    senhaGuia,
    consulta.numeroGuiaOperadora,
  );

  if (token.length !== 4) {
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [consulta.idEvento]: "Digite os 4 dígitos do token.",
    }));
    await exibirModalErroTokenInline(
      consulta.idEvento,
      "Digite os 4 dígitos do token.",
    );
    return;
  }
  if (!senhaGuia) {
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [consulta.idEvento]:
        "N\u00e3o encontramos a senha da guia para validar o token.",
    }));
    await exibirModalErroTokenInline(
      consulta.idEvento,
      "N\u00e3o encontramos a senha da guia para validar o token.",
    );
    return;
  }
  limparMensagemTokenInline(consulta.idEvento);
  setConsultaValidandoTokenId(consulta.idEvento);

  try {
    const response = await api.post("/sisclinic/token/validar", {
      token: toSafeTokenString(token),
      cdBeneficiario: toSafeTokenString(consulta.nrCarteiraPlano),
      numeroGuiaOperadora,
    });

    const retornoApi = extrairRetornoApiToken(response.data);
    const mensagem = normalizarMensagemTokenInline(retornoApi.mensagem || "");
    const mensagemLower = mensagem.toLowerCase();
    
    const tokenValidado =
      mensagemLower.includes("token validado com sucesso") ||
      mensagemLower.includes("senha ja validada com envio de token") ||
      (mensagemLower.includes("transação") && mensagemLower.includes("já foi enviada com sucesso"));

    if (!tokenValidado) {
      const mensagemErro =
        mensagem || "N\u00e3o foi poss\u00edvel validar o token informado.";
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: mensagemErro,
      }));
      await exibirModalErroTokenInline(consulta.idEvento, mensagemErro);
      return;
    }

    await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
      tokenValidado: true,
    });

    setTokenDigitadoPorConsulta((prev) => ({
      ...prev,
      [consulta.idEvento]: "",
    }));
    atualizarFeedbackTokenInline(
      consulta.idEvento,
      "success",
      "Token validado com sucesso. Atendimento liberado.",
    );
    setConsultaTokenAbertaId(null);
    setConsultaTecladoTokenId(null);
    setConsultaProcessandoSenhaId(null);

    await buscarConsultas();
    await exibirModalSucessoELiberarConsulta(consulta);

  } catch (error: any) {
    const mensagemErro = String(
      error?.response?.data?.mensagem || error?.message || "",
    ).toLowerCase();
    const tokenInvalido =
      mensagemErro.includes("token invalido") ||
      mensagemErro.includes("token inv\u00e1lido") ||
      mensagemErro.includes("ora-20400");
    const tokenJaConfirmado =
      mensagemErro.includes("senha ja validada com envio de token") ||
      mensagemErro.includes("senha j\u00e1 validada com envio de token") ||
      (mensagemErro.includes("transação") &&
        mensagemErro.includes("já foi enviada com sucesso")) ||
      (mensagemErro.includes("transacao") &&
        mensagemErro.includes("ja foi enviada com sucesso"));

    if (tokenInvalido) {
      const mensagem = "Token errado. Insira um token correto.";
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: mensagem,
      }));
      await exibirModalErroTokenInline(consulta.idEvento, mensagem);
      return;
    }

    if (tokenJaConfirmado) {
      try {
        const { data: consultaAtual } = await api.get(`/sisclinic/agenda/${consulta.idEvento}`);
        
        if (!consultaAtual?.tokenValidado) {
          await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
            tokenValidado: true,
          });
        }

        atualizarConsultaLocal(consulta.idEvento, {
          tokenValidado: true,
          autorizado: true,
          erroAutorizacao: false,
          mensagemErroAutorizacao: undefined
        });

        setTokenDigitadoPorConsulta((prev) => ({
          ...prev,
          [consulta.idEvento]: "",
        }));
        atualizarFeedbackTokenInline(
          consulta.idEvento,
          "success",
          "Atendimento liberado!",
        );
        setConsultaTokenAbertaId(null);
        setConsultaTecladoTokenId(null);
        setConsultaProcessandoSenhaId(null);

        await buscarConsultas();
        await exibirModalSucessoELiberarConsulta(consulta);

      } catch (patchError) {
        console.error("Erro ao atualizar tokenValidado:", patchError);
        try {
          await exibirModalSucessoELiberarConsulta(consulta);
        } catch (modalError) {
          setTokenErroPorConsulta((prev) => ({
            ...prev,
            [consulta.idEvento]: "Consulta liberada! Procure a recepção.",
          }));
        }
      }
      return;
    }

    const retornoApi = extrairRetornoApiToken(error?.response?.data);
    const mensagem = normalizarMensagemTokenInline(
      retornoApi.mensagem || error?.message || "Erro ao validar token",
    );
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [consulta.idEvento]: mensagem,
    }));
    await exibirModalErroTokenInline(consulta.idEvento, mensagem);
  } finally {
    setConsultaValidandoTokenId(null);
  }
};

  const preencherTokenViaTecladoInline = (
    consulta: ConsultaAutoAtendimento,
    digito: string,
  ) => {
    const idEvento = consulta.idEvento;
    const numero = String(digito).replace(/\D/g, "").slice(-1);

    if (!numero) {
      return;
    }

    let proximoToken = "";

    setTokenDigitadoPorConsulta((prev) => {
      const tokenAtual = String(prev[idEvento] || "")
        .replace(/\D/g, "")
        .slice(0, 4);
      if (tokenAtual.length >= 4) {
        proximoToken = tokenAtual;
        return prev;
      }

      proximoToken = tokenAtual + numero;
      return {
        ...prev,
        [idEvento]: proximoToken,
      };
    });

    limparMensagemTokenInline(idEvento);

    setTimeout(() => {
      focarCampoTokenInline(
        idEvento,
        proximoToken.length >= 4 ? 3 : proximoToken.length,
      );
    }, 0);
  };

  const limparTokenViaTecladoInline = (idEvento: number) => {
    setTokenDigitadoPorConsulta((prev) => ({
      ...prev,
      [idEvento]: "",
    }));
    limparMensagemTokenInline(idEvento);
    setTimeout(() => focarCampoTokenInline(idEvento, 0), 0);
  };

  const abrirEtapaSenha = async (consulta: ConsultaAutoAtendimento) => {
    setConsultaTokenAbertaId(consulta.idEvento);
    limparMensagemTokenInline(consulta.idEvento);

    if (consulta.autorizado && !consulta.tokenValidado) {
      return;
    }

    setConsultaProcessandoSenhaId(consulta.idEvento);

    if (String(consulta.senhaPainel || "").trim()) {
      if (!consulta.autorizado) {
        await abrirAutorizacaoComCompareceu(consulta, true, true);
      }
      return;
    }

    try {
      const senhaGerada = await emitirSenhaPainelAutomaticamente(consulta);

      await vincularSenhaPainel(consulta, {
        senhaPainelForcada: senhaGerada,
        abrirAutorizacaoAposVinculo: true,
        abrirTokenInlineAposVinculo: true,
      });
    } catch (error) {
      console.error("Erro ao gerar senha do painel:", error);
      await Swal.fire(
        "Erro",
        "N\u00e3o foi poss\u00edvel gerar e vincular a senha deste atendimento.",
        "error",
      );
      setConsultaProcessandoSenhaId(null);
    }
  };

  const voltarParaConsultas = () => {
    setEtapaTela("consultas");
    setConsultaSelecionadaId(null);
  };

  const confirmarEncerramentoAutoAtendimento = () => {
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
      return (
        String(consulta.localidadePainel || "N\u00e3o informado").trim() || null
      );
    }

    try {
      const dataReferencia =
        String(consulta.dataInicio || "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10);
      const locaisDoDia =
        await buscarLocaisProfissionaisPorData(dataReferencia);
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

      return (
        localCompleto ||
        String(consulta.localidadePainel || "N\u00e3o informado").trim() ||
        null
      );
    } catch (error) {
      console.warn(
        "N\u00e3o foi poss\u00edvel consultar o local do profissional:",
        error,
      );
      return (
        String(consulta.localidadePainel || "N\u00e3o informado").trim() || null
      );
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
          const locaisDoDia =
            await buscarLocaisProfissionaisPorData(dataReferencia);
          const periodoConsulta = obterPeriodoPorHora(consulta.horaInicio);
          const localDoProfissional =
            locaisDoDia.find((local) => {
              const mesmoProfissional =
                String(local?.idProfissional || "") ===
                String(consulta.idProfissional || "");
              const statusAtivo =
                !local?.status ||
                String(local.status).toUpperCase() === "ATIVO";
              const mesmaData =
                !local?.data ||
                String(local.data).slice(0, 10) === dataReferencia;
              const mesmoPeriodo =
                !local?.periodo ||
                String(local.periodo).toUpperCase() === periodoConsulta;

              return (
                mesmoProfissional && statusAtivo && mesmaData && mesmoPeriodo
              );
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
          console.warn(
            "N\u00e3o foi poss\u00edvel carregar o local do profissional:",
            error,
          );
          return consulta;
        }
      }),
    );

    return consultasComLocal;
  };

  const obterIdTipoAtendimentoPainel = async (
    consulta: ConsultaAutoAtendimento,
  ) => {
    const tiposAtendimento =
      await inteliteSenhaService.buscarTiposAtendimento();

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
        const nomeTipo = String(tipo.tipoAtendimento || "")
          .trim()
          .toUpperCase();
        const prefixoTipo = String(tipo.prefixo || "")
          .trim()
          .toUpperCase();

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
      throw new Error(
        "Tipo de atendimento Intelite inv\u00e1lido para emiss\u00e3o.",
      );
    }

    return idTipoAtendimento;
  };

  const emitirSenhaPainelAutomaticamente = async (
    consulta: ConsultaAutoAtendimento,
  ) => {
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
      throw new Error("A Intelite n\u00e3o retornou a senha emitida.");
    }

    return senhaGerada;
  };

  const vincularSenhaPainel = async (
    consulta: ConsultaAutoAtendimento,
    opcoes?: {
      senhaPainelForcada?: string;
      abrirAutorizacaoAposVinculo?: boolean;
      abrirTokenInlineAposVinculo?: boolean;
    },
  ) => {
    const senhaPainelInformada = String(
      opcoes?.senhaPainelForcada ||
        senhasPainelDigitadas[consulta.idEvento] ||
        "",
    )
      .trim()
      .toUpperCase();
    const senhaPainelAtual = String(consulta.senhaPainel || "")
      .trim()
      .toUpperCase();
    const senhaPainel = senhaPainelInformada || senhaPainelAtual;
    const localidadePainel =
      (await buscarLocalidadePainelDoProfissional(consulta)) ||
      "N\u00e3o informado";

    if (!senhaPainel) {
      setConsultaProcessandoSenhaId(null);
      await Swal.fire(
        "Informe a senha",
        "Digite a senha do painel para vincular este atendimento.",
        "warning",
      );
      return;
    }

    if (senhaPainelAtual && senhaPainel === senhaPainelAtual) {
      if (
        opcoes?.abrirAutorizacaoAposVinculo !== false &&
        !consulta.autorizado
      ) {
        await abrirAutorizacaoComCompareceu(
          consulta,
          true,
          opcoes?.abrirTokenInlineAposVinculo === true,
        );
      } else {
        setConsultaProcessandoSenhaId(null);
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
            (evento: any) =>
              String(evento.idEvento) === String(consulta.idEvento),
          )
        : null;

      if (
        !eventoValidado ||
        String(eventoValidado.senhaPainel || "")
          .trim()
          .toUpperCase() !== senhaPainel ||
        String(eventoValidado.prioridadePainel || "").trim() !==
          prioridadePainel
      ) {
        setSenhasPainelDigitadas((prev) => ({
          ...prev,
          [consulta.idEvento]: "",
        }));
        await Swal.fire(
          "Aten\u00e7\u00e3o",
          "O backend respondeu, mas a senha n\u00e3o apareceu salva na agenda. Tente atualizar e verificar novamente.",
          "warning",
        );
        return;
      }

      const senhaValidada = String(eventoValidado.senhaPainel || "")
        .trim()
        .toUpperCase();
      const prioridadeValidada =
        String(eventoValidado.prioridadePainel || "").trim() ||
        prioridadePainel;
      const localidadeValidada =
        String(eventoValidado.localidadePainel || "").trim() ||
        localidadePainel;

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

      const consultaAtualizada = consultasAtualizadas.find(
        (item) => item.idEvento === consulta.idEvento,
      ) || {
        ...consulta,
        senhaPainel: senhaValidada,
        prioridadePainel: prioridadeValidada,
        localidadePainel: localidadeValidada,
      };

      const deveContinuarAutomaticamente =
        opcoes?.abrirAutorizacaoAposVinculo !== false &&
        !consultaAtualizada.autorizado;

      if (!deveContinuarAutomaticamente) {
        setConsultaProcessandoSenhaId(null);
        await Swal.fire(
          "Senha vinculada",
          `A senha ${senhaPainel} foi vinculada com sucesso.`,
          "success",
        );
      }

      if (deveContinuarAutomaticamente) {
        await abrirAutorizacaoComCompareceu(
          consultaAtualizada,
          true,
          opcoes?.abrirTokenInlineAposVinculo === true,
        );
      }
    } catch (error) {
      console.error("Erro ao vincular senha do painel:", error);
      await Swal.fire(
        "Erro",
        "N\u00e3o foi poss\u00edvel vincular a senha deste atendimento.",
        "error",
      );
    }
  };
  const abrirValidacaoTokenDireta = async (
    consulta: ConsultaAutoAtendimento,
  ) => {
    const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
    const numeroGuiaOperadora = Number(
      consulta.numeroGuiaOperadora || consulta.senhaAutorizacao || 0,
    );

    if (!senhaGuia) {
      await Swal.fire(
        "Aten\u00e7\u00e3o",
        "N\u00e3o encontramos a senha da guia para validar o token.",
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
          item.idEvento === consulta.idEvento
            ? { ...item, tokenValidado: true }
            : item,
        );

        atualizarConsultaLocal(consulta.idEvento, {
          tokenValidado: true,
        });
        persistirTelaConsultas(
          normalizarCpf(cpf),
          pacienteNome || consulta.pacienteNome,
          consultasAtualizadas,
        );
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
        title: "Aten\u00e7\u00e3o",
        html: "Digite um CPF v\u00e1lido.<br />Sequ\u00eancias como Ex: 111.111.111-11 n\u00e3o s\u00e3o permitidas.",
        icon: "warning",
      });
      return;
    }

    const hoje = new Date().toISOString().split("T")[0];
    setLoading(true);

    try {
      const response = await api.get(
        "/sisclinic/agenda/relatorio/beneficiario",
        {
          params: {
            nuCpf: cpfLimpo,
            dataInicio: hoje,
            dataFim: hoje,
          },
        },
      );

      const itens = Array.isArray(response.data) ? response.data : [];
      const consultasMapeadas = itens
        .filter((item: any) => {
          if (!item?.dataInicio) return false;
          const data = new Date(item.dataInicio);
          return (
            !Number.isNaN(data.getTime()) && data.toISOString().startsWith(hoje)
          );
        })
        .map(
          (item: any): ConsultaAutoAtendimento => ({
            idEvento: Number(item.idEvento),
            idProfissional: item.profissional?.idProfissional || "",
            dataInicio: String(item.dataInicio || ""),
            horaInicio: String(item.horaInicio || ""),
            statusAgendamento: String(item.statusAgendamento || "AGENDADO"),
            profissionalNome:
              item.profissional?.nmProfissional ||
              "Profissional n\u00e3o informado",
            especialidadeNome:
              item.profissional?.especialidade?.dsEspecialidade ||
              "Especialidade n\u00e3o informada",
            pacienteNome:
              item.paciente?.nmPaciente ||
              "Benefici\u00e1rio n\u00e3o informado",
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
          "N\u00e3o encontramos consulta para hoje com esse CPF.",
          "info",
        );
        resetarTelaCpf();
        return;
      }

      const nomeBeneficiario =
        consultasOrdenadas[0]?.pacienteNome || "Benefici\u00e1rio";
      setCpf(formatarCpf(cpfLimpo));
      setConsultas(consultasOrdenadas);
      setPacienteNome(nomeBeneficiario);
      setConsultaSelecionadaId(null);
      setEtapaTela("consultas");
      persistirTelaConsultas(cpfLimpo, nomeBeneficiario, consultasOrdenadas);
      return;
    } catch (error) {
      console.error("Erro ao buscar consultas do benefici\u00e1rio:", error);
      await Swal.fire(
        "Erro",
        "N\u00e3o foi poss\u00edvel localizar os atendimentos de hoje.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const abrirAutorizacaoComCompareceu = async (
    consulta: ConsultaAutoAtendimento,
    iniciarAutomaticamente = false,
    abrirTokenInlineDepoisDoEnvio = false,
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
        console.error(
          "Erro ao atualizar comparecimento antes da autoriza\u00e7\u00e3o:",
          error,
        );
        await Swal.fire(
          "Erro",
          "N\u00e3o foi poss\u00edvel atualizar o comparecimento antes da autoriza\u00e7\u00e3o.",
          "error",
        );
        return;
      }
    }

    setIniciarAutorizacaoAutomaticamente(iniciarAutomaticamente);
    setAbrirTokenInlineAposEnvio(abrirTokenInlineDepoisDoEnvio);
    setConsultaAutorizacaoAberta({
      ...consulta,
      statusAgendamento: "COMPARECEU",
    });
  };

  const abrirEntradaCpf = () => {
    if (animandoSaidaTelaBoasVindasCpf) return;

    setAnimandoSaidaTelaBoasVindasCpf(true);

    window.setTimeout(() => {
      setMostrarTelaBoasVindasCpf(false);
      setAnimandoSaidaTelaBoasVindasCpf(false);
      setMostrarTecladoCpf(true);

      window.setTimeout(() => {
        inputCpfRef.current?.focus();
        inputCpfRef.current?.click();
      }, 120);
    }, 520);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eaf3ff_0%,#ffffff_28%,#eef6ff_100%)] text-slate-900">
      <main className="relative z-10 flex min-h-screen w-full flex-col">
        <div
          id="beneficiario-modal-root"
          className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
        />
        <ToastContainer
          position="top-right"
          autoClose={4000}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
          toastClassName="!rounded-[1rem] !border !border-slate-200 !bg-white !shadow-[0_18px_38px_rgba(15,23,42,0.16)]"
        />

        <SessaoExpiracaoCard
          mostrarModalInatividade={mostrarModalInatividade}
          segundosRestantesInatividade={segundosRestantesInatividade}
          formatarTempoSessao={formatarTempoSessao}
          onContinuar={reiniciarTemporizadorSessao}
        />

        <div className="w-full transition-all duration-200">
          {etapaTela === "cpf" && (
            <section className="w-full">
              {!mostrarTelaBoasVindasCpf ? (
                <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-6 text-white md:px-8 md:py-8">
                  <div className="mx-auto max-w-5xl px-2 md:px-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="text-center md:text-left">
                        <h2 className="text-[1.45rem] font-black tracking-tight text-white md:text-[2.2rem]">
                          {"Digite o CPF do benefici\u00e1rio"}
                        </h2>
                        <p className="mt-3 max-w-136 text-[1.6rem] text-blue-100">
                          Localize os agendamentos de hoje.
                        </p>
                      </div>
                      <div className="flex justify-center md:justify-end">
                        <div className="inline-flex min-h-10 flex-col items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-white">
                          <p className="text-[0.96rem] font-black uppercase tracking-[0.16em] text-white md:text-[1.02rem]">
                            {`JO\u00c3O PESSOA - ${dataCabecalhoAtual}`}
                          </p>
                          <p className="mt-1 text-[0.86rem] font-bold uppercase tracking-[0.12em] text-blue-50 md:text-[0.92rem]">
                            {`Hor\u00e1rio Atual: ${horaCabecalhoAtual}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                className={`flex-1 px-3 md:px-6 ${
                  mostrarTelaBoasVindasCpf ? "overflow-visible" : "overflow-hidden"
                } ${
                  mostrarTelaBoasVindasCpf
                    ? "py-4 md:py-5"
                    : "py-2 md:py-3"
                }`}
              >
                <div className="mx-auto max-w-6xl">
                  <div
                    className={`flex flex-col gap-3 ${
                      mostrarTelaBoasVindasCpf ? "min-h-fit h-auto pb-5" : "min-h-0 h-full"
                    }`}
                  >
                    {mostrarTelaBoasVindasCpf ? (
                      <button
                        type="button"
                        onClick={abrirEntradaCpf}
                        className={`group relative min-h-[26rem] w-full overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(231,242,255,0.92)_48%,rgba(217,232,251,0.9)_100%)] px-5 py-5 text-left shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition duration-500 hover:scale-[1.01] hover:shadow-[0_22px_52px_rgba(15,23,42,0.12)] md:min-h-[27.5rem] md:px-7 md:py-5 ${
                          animandoSaidaTelaBoasVindasCpf
                            ? "-translate-y-[110%] opacity-0"
                            : "translate-y-0 opacity-100"
                        }`}
                      >
                        <div className="pointer-events-none absolute inset-0">
                          <div className="absolute left-[10%] top-[14%] h-24 w-24 rounded-full bg-cyan-200/35 blur-2xl md:h-32 md:w-32" />
                          <div className="absolute right-[12%] top-[18%] h-20 w-20 rounded-full bg-blue-200/35 blur-2xl md:h-28 md:w-28" />
                          <div className="absolute bottom-[10%] left-[24%] h-28 w-28 rounded-full bg-sky-100/50 blur-3xl md:h-36 md:w-36" />
                        </div>

                        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
                          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-[#00338d]/10 bg-white/88 px-4 py-2 shadow-[0_10px_24px_rgba(0,51,141,0.08)]">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c81e3a_0%,#ef4444_100%)] text-white shadow-[0_8px_18px_rgba(200,30,58,0.28)]">
                              <FaHeartbeat className="text-[1.05rem]" />
                            </span>
                            <div className="text-left">
                              <p className="text-[0.74rem] font-black uppercase tracking-[0.18em] text-[#4f7bc6]">
                                TELA INICIAL
                              </p>
                              <p className="text-[1.18rem] font-black tracking-[0.03em] text-[#00338d] md:text-[1.45rem]">
                                Afrafep Saúde
                              </p>
                            </div>
                          </div>

                          <h2 className="max-w-3xl text-[1.72rem] font-black tracking-tight text-[#0f2d78] md:text-[2.32rem]">
                            Bem-vindo ao autoatendimento
                          </h2>
                          <p className="mt-2 max-w-3xl text-[0.92rem] leading-relaxed text-slate-600 md:text-[1.02rem]">
                            Toque na tela para abrir o campo do CPF e localizar
                            seus agendamentos de hoje.
                          </p>

                          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-cyan-100 bg-white/92 px-5 py-2.5 text-[#16357f] shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
                            <span className="text-[0.82rem] font-black uppercase tracking-[0.14em] md:text-[0.9rem]">
                              Joao Pessoa
                            </span>
                            <span className="hidden h-1.5 w-1.5 rounded-full bg-cyan-300 md:inline-flex" />
                            <span className="text-[0.82rem] font-black uppercase tracking-[0.14em] md:text-[0.9rem]">
                              {dataCabecalhoAtual}
                            </span>
                            <span className="hidden h-1.5 w-1.5 rounded-full bg-cyan-300 md:inline-flex" />
                            <span className="text-[0.82rem] font-black uppercase tracking-[0.14em] md:text-[0.9rem]">
                              {`Horario atual: ${horaCabecalhoAtual}`}
                            </span>
                          </div>

                          <div className="mt-4 w-full max-w-3xl rounded-[1.6rem] border-2 border-cyan-100 bg-white/96 px-5 py-4.5 text-center shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
                            <div className="flex flex-col items-center gap-2.5">
                              <span className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-[linear-gradient(135deg,#123a97_0%,#2957d3_52%,#3eb6f4_100%)] text-white shadow-[0_16px_28px_rgba(0,51,141,0.20)] md:h-14 md:w-14">
                                <FaHandPointer className="text-[1.18rem]" />
                              </span>
                              <p className="text-[1.08rem] font-black text-[#16357f] md:text-[1.2rem]">
                                Toque na tela para digitar o CPF
                              </p>
                              <p className="max-w-2xl text-[0.88rem] font-black leading-relaxed text-slate-700 md:text-[0.96rem]">
                                Basta tocar em qualquer parte desta tela para abrir o campo do CPF automaticamente.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid w-full gap-3.5 md:grid-cols-3">
                            {[
                              {
                                icon: FaClinicMedical,
                                titulo: "Consultas do dia",
                                texto: "Veja rapidamente os atendimentos agendados.",
                              },
                              {
                                icon: FaShieldAlt,
                                titulo: "Acesso simples",
                                texto: "Fluxo claro, com letras grandes e interação fácil.",
                              },
                              {
                                icon: FaNotesMedical,
                                titulo: "Orientação guiada",
                                texto: "A tela mostra cada passo até iniciar o atendimento.",
                              },
                            ].map((item, indice) => {
                              const Icone = item.icon;
                              return (
                                <div
                                  key={item.titulo}
                                  className="rounded-[1.4rem] border border-white/85 bg-white/92 px-4 py-4 text-left shadow-[0_16px_28px_rgba(15,23,42,0.08)]"
                                  style={{
                                    animation: "floatDance 5s ease-in-out infinite",
                                    animationDelay: `${indice * 0.35}s`,
                                  }}
                                >
                                  <span className="mb-2.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0f4db7] md:h-11 md:w-11">
                                    <Icone className="text-[1.08rem]" />
                                  </span>
                                  <p className="text-[0.98rem] font-black text-[#16357f] md:text-[1.03rem]">
                                    {item.titulo}
                                  </p>
                                  <p className="mt-1 text-[0.84rem] leading-relaxed text-slate-600 md:text-[0.9rem]">
                                    {item.texto}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                            {[
                              FaHeartbeat,
                              FaClinicMedical,
                              FaShieldAlt,
                              FaStethoscope,
                              FaNotesMedical,
                              FaBriefcaseMedical,
                            ].map((Icone, indice) => (
                              <span
                                key={`icone-saude-${indice}`}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/85 bg-white/90 text-[#0f4db7] shadow-[0_12px_22px_rgba(15,23,42,0.08)] md:h-12 md:w-12"
                                style={{
                                  animation: "pulseSeal 4.8s ease-in-out infinite",
                                  animationDelay: `${indice * 0.18}s`,
                                }}
                              >
                                 <Icone className="text-[1rem] md:text-[1.08rem]" />
                              </span>
                            ))}
                          </div>

                        </div>

                        <style>{`
                          @keyframes floatDance {
                            0%, 100% { transform: translateY(0px) rotate(0deg); }
                            50% { transform: translateY(-10px) rotate(-1.5deg); }
                          }

                          @keyframes pulseSeal {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.04); }
                          }
                        `}</style>
                      </button>
                    ) : (
                      <>
                        <div>
                          <div className="bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] md:p-2.5">
                            <input
                              ref={inputCpfRef}
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
                              className="h-[4.25rem] w-full border-0 bg-slate-50 px-6 text-center text-[1.26rem] font-black tracking-[0.12em] text-slate-900 outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00338d]/10 md:h-[4.75rem] md:text-[1.62rem]"
                            />
                          </div>
                        </div>

                        {mostrarTecladoCpf ? (
                          <CpfTecladoNumerico
                            loading={loading}
                            onAdicionarDigito={adicionarDigitoCpf}
                            onApagarUltimo={apagarUltimoDigitoCpf}
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {etapaTela === "consultas" && (
            <>
              <section className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
                <div className="sticky top-0 z-30 w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-4 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-[linear-gradient(135deg,rgba(0,51,141,0.94)_0%,rgba(15,77,183,0.94)_52%,rgba(26,120,214,0.94)_100%)] md:px-8 md:py-5">
                  <ConsultasHeader
                    pacienteNome={pacienteNome}
                    dataConsultasCabecalho={dataConsultasCabecalho}
                    onSair={() => void confirmarEncerramentoAutoAtendimento()}
                  />
                </div>

                <div className="flex-1 overflow-hidden px-3 pb-2 pt-2 md:px-5 md:pb-3 md:pt-2.5">
                  <div className="mx-auto flex h-full max-w-6xl flex-col gap-1.5 overflow-hidden">
                    <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-3 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] md:px-4 md:py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[1.08rem] font-bold leading-[1.45] text-slate-700 md:text-[1.52rem]">
                          {(() => {
                            const totalConsultas = cardsConsultasFluxo.length;
                            const consultaAtual = consultaFluxoAtual;
                            const isAutorizada =
                              consultaAtual?.autorizacaoConcluida;
                            const isUltimaConsulta =
                              indiceConsultaAtual === totalConsultas - 1;

                            // CASO 1: Apenas 1 consulta no total
                            if (totalConsultas === 1) {
                              return isAutorizada
                                ? "✅ Consulta autorizada, aguarde para ser atendido!"
                                : "Finalize o autoatendimento para liberar sua consulta.";
                            }

                            // CASO 2: Última consulta da lista
                            if (isUltimaConsulta) {
                              return isAutorizada
                                ? "✅ Todas as consultas autorizadas! Aguarde o atendimento."
                                : "Finalize o autoatendimento para liberar a última consulta.";
                            }

                            // CASO 3: Consultas intermediárias
                            return isAutorizada
                              ? "✅ Autorizado. Consulta liberada."
                              : "Finalize o autoatendimento para liberar a próxima consulta.";
                          })()}
                        </p>

                        {/* CONTAGEM 1/2 NO CANTO DIREITO */}
                        {cardsConsultasFluxo.length > 1 && (
                          <span className="text-[1.4rem] font-black text-[#00338d] md:text-[2rem]">
                            {indiceConsultaAtual + 1}/
                            {cardsConsultasFluxo.length}
                          </span>
                        )}
                      </div>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
  {consultaFluxoAtual
    ? (() => {
        const {
          cardConsulta,
          consulta,
          autorizacaoConcluida,
        } = consultaFluxoAtual;
        const statusAtual = String(
          consulta.statusAgendamento || "",
        ).toUpperCase();
        const faltouConsulta = statusAtual === "FALTOU";
        const compareceuConsulta = statusAtual === "COMPARECEU";
        const podeAutorizar = [
          "AGENDADO",
          "CONFIRMADO",
          "COMPARECEU",
        ].includes(statusAtual);
        const processandoSenha =
          consultaProcessandoSenhaId === consulta.idEvento;
        const tokenAberto = consultaTokenAbertaId === consulta.idEvento;

        // VERIFICA SE DEVE MOSTRAR "PROCURE A RECEPÇÃO"
        const deveProcurarRecepcao =
          !normalizarBoolean(consulta.autorizado) &&
          !normalizarBoolean(consulta.tokenValidado) &&
          (possuiSenhaAutorizacao(consulta.senhaAutorizacao) ||
            consulta.erroAutorizacao === true);

        // TOKEN INLINE VISÍVEL - NÃO MOSTRAR SE HOUVER ERRO
        const tokenInlineVisivel =
          !autorizacaoConcluida &&
          consulta.erroAutorizacao !== true &&
          (processandoSenha || tokenAberto || normalizarBoolean(consulta.autorizado));

        // VERIFICA SE O TOKEN JÁ FOI ENVIADO NO FLUXO
        const tokenEnviadoNoFluxo =
          normalizarBoolean(consulta.autorizado) && !autorizacaoConcluida;

        // VERIFICA SE PODE SEGUIR
        const podeSeguir =
          podeAutorizar || tokenInlineVisivel || autorizacaoConcluida;

        const tokenDigitado =
          tokenDigitadoPorConsulta[consulta.idEvento] || "";
        const reenviandoToken =
          consultaReenviandoTokenId === consulta.idEvento;
        const validandoToken =
          consultaValidandoTokenId === consulta.idEvento;
        const tecladoTokenAberto =
          consultaTecladoTokenId === consulta.idEvento;
        const segundosRestantesReenvio = Math.max(
          0,
          Math.ceil(
            ((bloqueioReenvioAtePorConsulta[consulta.idEvento] || 0) -
              agoraReenvioToken) /
              1000,
          ),
        );

        return (
          <article
            key={cardConsulta.chave}
            className={`relative flex min-h-0 flex-1 flex-col border ${
              tokenInlineVisivel ? "p-2" : "p-2"
            } shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition ${
              autorizacaoConcluida
                ? "border-emerald-200 bg-emerald-50/55 opacity-75"
                : consulta.erroAutorizacao === true
                ? "border-red-300 bg-red-50/50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Status - canto superior direito */}
              <div className="flex justify-end shrink-0">
                {!compareceuConsulta ||
                tokenEnviadoNoFluxo ||
                autorizacaoConcluida ||
                faltouConsulta ? (
                  <p
                    className={`inline-flex ${
                      tokenInlineVisivel
                        ? "min-h-7 px-3 py-1 text-[0.75rem] md:text-[0.85rem]"
                        : "min-h-9 px-4 py-1.5 text-[0.82rem] md:text-[0.96rem]"
                    } items-center gap-2 rounded-full border text-center font-black uppercase tracking-[0.06em] shadow-[0_8px_14px_rgba(15,23,42,0.08)] ${
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
                          faltouConsulta
                            ? "bg-red-500"
                            : consulta.erroAutorizacao === true
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

              {/* Container centralizado - Ocupa todo o espaço disponível */}
                <div
                  className={`flex-1 flex flex-col items-center justify-center text-center py-1 ${
                    tokenInlineVisivel ? "gap-0" : "gap-1"
                  }`}
                >
                {/* HORÁRIO */}
                {cardConsulta.agrupadoUltrassom ? (
                  <p className="font-black uppercase tracking-[0.05em] text-[#00338d] text-[1.8rem] md:text-[2.2rem] leading-tight">
                    {obterFaixaHorariosConsultas(
                      cardConsulta.consultasRelacionadas,
                    ) || "Horários do dia"}
                  </p>
                ) : (
                  <p
                    className={`font-black tracking-tight text-[#00338d] leading-none ${
                      tokenInlineVisivel
                        ? "text-[3.3rem] md:text-[4rem]"
                        : "text-[4.4rem] md:text-[5.3rem]"
                    }`}
                  >
                    {formatarHora(consulta.horaInicio)}
                  </p>
                )}

                {/* PROFISSIONAL */}
                <p
                    className={`mt-0.5 font-black uppercase tracking-[0.02em] text-slate-900 leading-tight ${
                      tokenInlineVisivel
                        ? "text-[1.55rem] md:text-[1.85rem]"
                        : "text-[2.3rem] md:text-[2.75rem]"
                    }`}
                >
                  {consulta.profissionalNome}
                </p>

                {/* ESPECIALIDADE */}
                <p
                    className={`font-black uppercase text-[#180539] leading-tight ${
                      tokenInlineVisivel
                        ? "text-[0.95rem] md:text-[1.3rem]"
                        : "text-[1.35rem] md:text-[2.05rem]"
                    }`}
                >
                  {consulta.especialidadeNome}
                </p>

                {/* LOCAL - Dinâmico baseado na especialidade */}
                <p
                    className={`mt-0.5 font-black text-[#00338d] leading-tight ${
                      tokenInlineVisivel
                        ? "text-[1.9rem] md:text-[2.2rem]"
                        : "text-[2.8rem] md:text-[3.2rem]"
                    }`}
                >
                  {(() => {
                    const especialidade =
                      consulta.especialidadeNome?.toLowerCase() || "";

                    const localMap: Record<string, string> = {
                      // SUBSOLO
                      fisioterapeuta: "SUBSOLO",
                      "fisioterapeuta sad": "SUBSOLO",
                      "fisoterapeuta sad": "SUBSOLO",
                      "terapeuta ocupacional": "SUBSOLO",
                      "terapeuta ocupacional infantil": "SUBSOLO",
                      "terapia ocupacional": "SUBSOLO",
                      "terapia ocupacional infantil": "SUBSOLO",
                      osteopatia: "SUBSOLO",
                      quiropata: "SUBSOLO",

                      // 1º ANDAR
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

                      // TÉRREO
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
                      "outros profissionais nao classificaveis nessa tabela (padrao)":
                        "TÉRREO",
                      "sem preferência": "TÉRREO",
                      procedimento: "TÉRREO",
                      sad: "TÉRREO",
                      medico: "TÉRREO",
                    };

                    for (const [key, value] of Object.entries(localMap)) {
                      if (especialidade.includes(key)) {
                        return value;
                      }
                    }

                    if (consulta.localidadePainel) {
                      return consulta.localidadePainel;
                    }

                    return "Local não informado";
                  })()}
                </p>

                {/* MENSAGEM DE ERRO - Exibe quando há erro de autorização */}
                {consulta.erroAutorizacao === true &&
                  consulta.mensagemErroAutorizacao && (
                    <p className="text-xs text-red-500 mt-1 max-w-[90%] break-words">
                      {consulta.mensagemErroAutorizacao}
                    </p>
                  )}
              </div>

              {/* BOTÃO - Fixo na parte inferior */}
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
                    segundosRestantesReenvio={segundosRestantesReenvio}
                    onTokenChange={(indiceToken, valor) =>
                      atualizarTokenDigitadoInline(
                        consulta.idEvento,
                        indiceToken,
                        valor,
                      )
                    }
                    onTokenKeyDown={(indiceToken, event) =>
                      handleTokenInlineKeyDown(
                        consulta.idEvento,
                        indiceToken,
                        event,
                      )
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
                    onLimparToken={() =>
                      limparTokenViaTecladoInline(consulta.idEvento)
                    }
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
                  className={`mt-1.5 h-10 shrink-0 w-full px-4 text-[0.85rem] font-black text-white shadow-[0_8px_16px_rgba(0,51,141,0.14)] transition md:text-[1.3rem] ${
                    deveProcurarRecepcao
                      ? "cursor-not-allowed border-4 border-red-800 bg-red-600 text-white shadow-none"
                      : "bg-[#00338d] hover:bg-[#00286f]"
                  }`}
                >
                  {deveProcurarRecepcao ? "PROCURE A RECEPÇÃO" : "INICIAR CONSULTA"}
                </button>
              ) : (
                <div
                  className={`flex h-10 shrink-0 w-full items-center justify-center px-3 text-center text-[0.8rem] font-bold ${
                    faltouConsulta
                      ? "bg-red-50 text-red-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {faltouConsulta
                    ? "Atendimento encerrado"
                    : "Atendimento indisponível"}
                </div>
              )}
            </div>
          </article>
        );
      })()
    : null}
</div>
                    </div>

                    <ConsultaFluxoNavegacao
                      podeVoltar={indiceConsultaAtual > 0}
                      podeAvancar={indiceConsultaAtual < indiceMaximoLiberado}
                      onVoltar={() =>
                        setIndiceConsultaAtual((valorAtual) =>
                          Math.max(valorAtual - 1, 0),
                        )
                      }
                      onAvancar={() =>
                        setIndiceConsultaAtual((valorAtual) =>
                          Math.min(valorAtual + 1, indiceMaximoLiberado),
                        )
                      }
                    />
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
                      {"AUTORIZA\u00c7\u00c3O"}
                    </h2>
                    <p className="mt-2 text-[1.6rem] text-blue-100">
                      {
                        "Confira o atendimento. A senha do painel ser\u00e1 gerada e vinculada automaticamente antes de seguir, para autoriza\u00e7\u00e3o."
                      }
                    </p>
                    <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">
                      {dataConsultasCabecalho &&
                      dataConsultasCabecalho !== "--/--/----"
                        ? dataConsultasCabecalho
                        : "Data do atendimento"}
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
                    senhaPainelDigitada={
                      senhasPainelDigitadas[consultaSelecionada.idEvento] ?? ""
                    }
                    onSenhaPainelChange={(value) =>
                      atualizarTextoSenhaPainel(
                        consultaSelecionada.idEvento,
                        value,
                      )
                    }
                  />

                  <SenhaAutorizacaoAcoes
                    autorizado={consultaSelecionada.autorizado}
                    tokenValidado={consultaSelecionada.tokenValidado}
                    senhaPainel={consultaSelecionada.senhaPainel}
                    onVincularSenha={() =>
                      void vincularSenhaPainel(consultaSelecionada)
                    }
                    onConfirmarToken={() =>
                      void abrirValidacaoTokenDireta(consultaSelecionada)
                    }
                    onSair={voltarParaConsultas}
                  />
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
              setAbrirTokenInlineAposEnvio(false);
            }}
            onAfterFlow={() =>
              finalizarFluxoTokenInline(consultaAutorizacaoAberta.idEvento)
            }
            iniciarAutomaticamente={iniciarAutorizacaoAutomaticamente}
            abrirTokenInlineAposEnvio={abrirTokenInlineAposEnvio}
          />
        )}
      </main>
    </div>
  );
};

export default BeneficiarioAutoAtendimento;



