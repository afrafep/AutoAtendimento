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
import ConsultasHeader from "./beneficiario/ConsultasHeader";
import CpfTecladoNumerico from "./beneficiario/CpfTecladoNumerico";
import SessaoExpiracaoCard from "./beneficiario/SessaoExpiracaoCard";
import AutorizacaoPreparandoCard from "./beneficiario/AutorizacaoPreparandoCard";
import TokenInlinePanel from "./beneficiario/TokenInlinePanel";
import ConsultaProfissionalResumoCard from "./beneficiario/ConsultaProfissionalResumoCard";
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

const TEMPO_INATIVIDADE_MS = 50 * 1000;
const CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS = 20;
const CONTAGEM_ENCERRAMENTO_AUTOMATICO_SEGUNDOS = 0;
const BLOQUEIO_REENVIO_TOKEN_MS = 40 * 1000;

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
    consulta.descricaoEvento || consulta.nomeEvento || "Procedimento n\u00e3o informado",
  ).trim();
};

const agruparProcedimentosRelacionados = (consultas: ConsultaAutoAtendimento[]) => {
  const mapa = new Map<string, { descricao: string; horarios: string[]; quantidade: number; chave: string }>();

  consultas.forEach((consulta) => {
    const descricao = obterDescricaoProcedimentoConsulta(consulta);
    const chave = descricao.trim().toUpperCase();
    const existente = mapa.get(chave);

    if (existente) {
      existente.horarios.push(formatarHora(consulta.horaInicio));
      existente.quantidade += 1;
      return;
    }

    mapa.set(chave, {
      descricao,
      horarios: [formatarHora(consulta.horaInicio)],
      quantidade: 1,
      chave,
    });
  });

  return Array.from(mapa.values()).map((item) => ({
    ...item,
    horarios: item.horarios.sort((a, b) => a.localeCompare(b)),
  }));
};

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
            <h2 className="text-[1.45rem] font-black tracking-tight">{"Autoriza\u00e7\u00e3o TISS SADT"}</h2>
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
                  {"Carteira: "}{consulta.nrCarteiraPlano || "N\u00e3o informada"}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-600 bg-slate-800/55 p-4">
            <div className="mb-4 flex items-center gap-3 text-white">
              <FaUserMd className="text-cyan-300" size={20} />
              <h3 className="text-[1.02rem] font-bold">Detalhes do Profissional</h3>
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
              {loading ? "Carregando agenda..." : "Iniciar Autoriza\u00e7\u00e3o"}
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
    return "Token inv\u00e1lido";
  }
  return texto;
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
  const [horaCabecalhoAtual, setHoraCabecalhoAtual] = useState(() => formatarHoraAtual());
  const [abrirTokenInlineAposEnvio, setAbrirTokenInlineAposEnvio] = useState(false);
  const [consultaTokenAbertaId, setConsultaTokenAbertaId] = useState<number | null>(null);
  const [tokenDigitadoPorConsulta, setTokenDigitadoPorConsulta] = useState<Record<number, string>>({});
  const [tokenErroPorConsulta, setTokenErroPorConsulta] = useState<Record<number, string>>({});
  const [tokenFeedbackPorConsulta, setTokenFeedbackPorConsulta] = useState<
    Record<number, TokenFeedbackInline | undefined>
  >({});
  const [consultaReenviandoTokenId, setConsultaReenviandoTokenId] = useState<number | null>(null);
  const [consultaValidandoTokenId, setConsultaValidandoTokenId] = useState<number | null>(null);
  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<number | null>(null);
  const [bloqueioReenvioAtePorConsulta, setBloqueioReenvioAtePorConsulta] = useState<Record<number, number>>({});
  const [agoraReenvioToken, setAgoraReenvioToken] = useState(() => Date.now());
  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);

  const [segundosRestantesInatividade, setSegundosRestantesInatividade] = useState(
    CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS,
  );
  const timeoutInatividadeRef = useRef<number | null>(null);
  const intervaloSessaoRef = useRef<number | null>(null);
  const intervaloModalInatividadeRef = useRef<number | null>(null);
  const expiracaoSessaoRef = useRef(Date.now() + TEMPO_INATIVIDADE_MS);

  const consultaSelecionada =
    consultas.find((consulta) => consulta.idEvento === consultaSelecionadaId) || null;

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
          const minutosAtual = converterHoraParaMinutos(consultaAtual.horaInicio);
          const minutosUltimo = converterHoraParaMinutos(ultimaDoBloco.horaInicio);
          const diferencaMinutos =
            minutosAtual !== null && minutosUltimo !== null ? minutosAtual - minutosUltimo : 0;

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

        if (indiceAtual === consultasOrdenadas.length - 1 && blocoAtual.length > 0) {
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

    expiracaoSessaoRef.current = Date.now() + TEMPO_INATIVIDADE_MS;


    intervaloSessaoRef.current = window.setInterval(() => {
      const restante = Math.max(0, Math.ceil((expiracaoSessaoRef.current - Date.now()) / 1000));


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
    const existeBloqueioAtivo = Object.values(bloqueioReenvioAtePorConsulta).some(
      (tempo) => tempo > Date.now(),
    );

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

    if (!consultaFluxoAtual.autorizado || consultaFluxoAtual.autorizacaoConcluida) {
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
    if (!hidratado) return;

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
  }, [hidratado, etapaTela, indiceConsultaAtual, consultaTokenAbertaId, consultaProcessandoSenhaId, consultaTecladoTokenId]);

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
      const atual = Array.from({ length: 4 }, (_, posicao) => prev[idEvento]?.[posicao] || "");
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
    const numeros = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
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
        [consulta.idEvento]: "N\u00e3o encontramos a senha da guia para reenviar o token.",
      }));
      await exibirModalErroTokenInline(consulta.idEvento, "N\u00e3o encontramos a senha da guia para reenviar o token.");
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
          [consulta.idEvento]: "N\u00e3o foi poss\u00edvel reenviar o token agora.",
        }));
        await exibirModalErroTokenInline(consulta.idEvento, "N\u00e3o foi poss\u00edvel reenviar o token agora.");
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
        [consulta.idEvento]: "N\u00e3o foi poss\u00edvel reenviar o token agora.",
      }));
      await exibirModalErroTokenInline(consulta.idEvento, "N\u00e3o foi poss\u00edvel reenviar o token agora.");
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
    mensagemNormalizada.toLowerCase() === "token inv\u00e1lido" ||
    mensagemNormalizada.toLowerCase() === "token invalido"
      ? "TOKEN INV\u00c1LIDO"
      : "ERRO AO VALIDAR TOKEN";

  await Swal.fire({
    title: titulo,
    text:
      titulo === "TOKEN INV\u00c1LIDO"
        ? "O c\u00f3digo digitado est\u00e1 incorreto. Feche esta mensagem e digite novamente o c\u00f3digo que chegou no seu celular, pelo aplicativo ou por SMS."
        : mensagemNormalizada || "N\u00e3o foi poss\u00edvel validar o token.",
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

const validarTokenInline = async (consulta: ConsultaAutoAtendimento) => {
  const token = String(tokenDigitadoPorConsulta[consulta.idEvento] || "").replace(/\D/g, "");
  const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
  const numeroGuiaOperadora = resolveNumeroGuiaOperadoraInline(
    senhaGuia,
    consulta.numeroGuiaOperadora,
  );

  if (token.length !== 4) {
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [consulta.idEvento]: "Digite os 4 dï¿½gitos do token.",
    }));
    await exibirModalErroTokenInline(consulta.idEvento, "Digite os 4 dï¿½gitos do token.");
    return;
  }
  if (!senhaGuia) {
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [consulta.idEvento]: "N\u00e3o encontramos a senha da guia para validar o token.",
    }));
    await exibirModalErroTokenInline(consulta.idEvento, "N\u00e3o encontramos a senha da guia para validar o token.");
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
      mensagemLower.includes("senha ja validada com envio de token");

    if (!tokenValidado) {
      const mensagemErro = mensagem || "N\u00e3o foi poss\u00edvel validar o token informado.";
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
    await buscarConsultas();
  } catch (error: any) {
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
    const tokenAtual = String(prev[idEvento] || "").replace(/\D/g, "").slice(0, 4);
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
    focarCampoTokenInline(idEvento, proximoToken.length >= 4 ? 3 : proximoToken.length);
  }, 0);
};

const apagarUltimoDigitoViaTecladoInline = (idEvento: number) => {
  let proximoToken = "";

  setTokenDigitadoPorConsulta((prev) => {
    proximoToken = String(prev[idEvento] || "").slice(0, -1);
    return {
      ...prev,
      [idEvento]: proximoToken,
    };
  });

  limparMensagemTokenInline(idEvento);
  setTimeout(() => focarCampoTokenInline(idEvento, Math.min(proximoToken.length, 3)), 0);
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
      return String(consulta.localidadePainel || "N\u00e3o informado").trim() || null;
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
        String(consulta.localidadePainel || "N\u00e3o informado").trim() ||
        null
      );
    } catch (error) {
      console.warn("N\u00e3o foi poss\u00edvel consultar o local do profissional:", error);
      return String(consulta.localidadePainel || "N\u00e3o informado").trim() || null;
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
          console.warn("N\u00e3o foi poss\u00edvel carregar o local do profissional:", error);
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
      throw new Error("Tipo de atendimento Intelite inv\u00e1lido para emiss\u00e3o.");
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
      opcoes?.senhaPainelForcada || senhasPainelDigitadas[consulta.idEvento] || "",
    )
      .trim()
      .toUpperCase();
    const senhaPainelAtual = String(consulta.senhaPainel || "")
      .trim()
      .toUpperCase();
    const senhaPainel = senhaPainelInformada || senhaPainelAtual;
    const localidadePainel =
      (await buscarLocalidadePainelDoProfissional(consulta)) || "N\u00e3o informado";

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
      if (opcoes?.abrirAutorizacaoAposVinculo !== false && !consulta.autorizado) {
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
  const abrirValidacaoTokenDireta = async (consulta: ConsultaAutoAtendimento) => {
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
        title: "Aten\u00e7\u00e3o",
        html: "Digite um CPF v\u00e1lido.<br />Sequ\u00eancias como Ex: 111.111.111-11 n\u00e3o s\u00e3o permitidas.",
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
              item.profissional?.nmProfissional || "Profissional n\u00e3o informado",
            especialidadeNome:
              item.profissional?.especialidade?.dsEspecialidade ||
              "Especialidade n\u00e3o informada",
            pacienteNome: item.paciente?.nmPaciente || "Benefici\u00e1rio n\u00e3o informado",
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
      await Swal.fire("Erro", "N\u00e3o foi poss\u00edvel atualizar o comparecimento.", "error");
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
        console.error("Erro ao atualizar comparecimento antes da autoriza\u00e7\u00e3o:", error);
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

              <div className="flex-1 overflow-hidden px-3 py-2 md:px-6 md:py-3">
                <div className="mx-auto max-w-6xl">
                  <div className="flex min-h-0 h-full flex-col gap-3">
                    <div>
                      <div className="bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] md:p-2.5">
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
                          className="h-[4.25rem] w-full border-0 bg-slate-50 px-6 text-center text-[1.26rem] font-black tracking-[0.12em] text-slate-900 outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00338d]/10 md:h-[4.75rem] md:text-[1.62rem]"
                        />
                      </div>
                    </div>

                    {mostrarTecladoCpf ? (
                      <CpfTecladoNumerico
                        loading={loading}
                        onAdicionarDigito={adicionarDigitoCpf}
                        onLimpar={limparCpfDigitado}
                        onApagarUltimo={apagarUltimoDigitoCpf}
                      />
                    ) : null}
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

                <SessaoExpiracaoCard
                  mostrarModalInatividade={mostrarModalInatividade}
                  segundosRestantesInatividade={segundosRestantesInatividade}
                  formatarTempoSessao={formatarTempoSessao}
                  onContinuar={reiniciarTemporizadorSessao}
                />

                <div className="flex-1 overflow-hidden px-3 pb-2 pt-2 md:px-5 md:pb-3 md:pt-2.5">
                  <div className="mx-auto flex h-full max-w-6xl flex-col gap-1.5 overflow-hidden">
                    <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-3 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] md:px-4 md:py-2.5">
                      <div className="mb-1.5 flex items-start justify-between gap-3">
                        <p className="text-[1.08rem] font-bold leading-[1.45] text-slate-700 md:text-[1.52rem]">
                          {consultaFluxoAtual?.autorizacaoConcluida
                            ? "Autorizado. Pr\u00f3ximo hor\u00e1rio liberado."
                            : "Finalize o autoatendimento para liberar o pr\u00f3ximo hor\u00e1rio."}
                        </p>
                        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-[0.88rem] font-black uppercase tracking-[0.05em] text-[#00338d] md:text-[0.96rem]">
                          {consultaFluxoAtual ? `${consultaFluxoAtual.etapaAtual}/${consultaFluxoAtual.total}` : "0/0"}
                        </span>
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {consultaFluxoAtual
                          ? (() => {
                              const { cardConsulta, consulta, autorizacaoConcluida } = consultaFluxoAtual;
                              const statusAtual = String(consulta.statusAgendamento || "").toUpperCase();
                              const faltouConsulta = statusAtual === "FALTOU";
                              const compareceuConsulta = statusAtual === "COMPARECEU";
                              const podeAutorizar = ["AGENDADO", "CONFIRMADO", "COMPARECEU"].includes(statusAtual);
                              const processandoSenha = consultaProcessandoSenhaId === consulta.idEvento;
                              const tokenAberto = consultaTokenAbertaId === consulta.idEvento;
                              const tokenEnviadoNoFluxo = normalizarBoolean(consulta.autorizado) && !autorizacaoConcluida;
                              const tokenInlineVisivel = !autorizacaoConcluida && (processandoSenha || tokenAberto || normalizarBoolean(consulta.autorizado));
                              const podeSeguir = podeAutorizar || tokenInlineVisivel || autorizacaoConcluida;
                              const tokenDigitado = tokenDigitadoPorConsulta[consulta.idEvento] || "";
                              const tokenErro = tokenErroPorConsulta[consulta.idEvento] || "";
                              const tokenFeedback = tokenFeedbackPorConsulta[consulta.idEvento];
                              const reenviandoToken = consultaReenviandoTokenId === consulta.idEvento;
                              const validandoToken = consultaValidandoTokenId === consulta.idEvento;
                              const tecladoTokenAberto = consultaTecladoTokenId === consulta.idEvento;
                              const segundosRestantesReenvio = Math.max(0, Math.ceil(((bloqueioReenvioAtePorConsulta[consulta.idEvento] || 0) - agoraReenvioToken) / 1000));

                              return (
                                <article
                                  key={cardConsulta.chave}
                                  className={`relative flex min-h-0 flex-1 flex-col border ${tokenInlineVisivel ? "p-2" : "p-2.5"} shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition ${
                                    autorizacaoConcluida
                                      ? "border-emerald-200 bg-emerald-50/55 opacity-75"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <div className="flex min-h-0 flex-1 flex-col gap-2.5">
                                    <div className="flex flex-col gap-2.5">
                                      {tokenInlineVisivel ? (
                                        <div className="flex justify-end">
                                        <p
                                          className={`inline-flex ${tokenInlineVisivel ? "min-h-8 px-3 py-1 text-[0.68rem] md:text-[0.74rem]" : "min-h-9 px-4 py-1.5 text-[0.76rem] md:text-[0.84rem]"} max-w-full items-center gap-2 rounded-full border text-center font-black uppercase tracking-[0.08em] shadow-[0_10px_18px_rgba(15,23,42,0.1)] ${
                                            faltouConsulta
                                              ? "border-red-200 bg-red-50 text-red-700"
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
                                                  : tokenEnviadoNoFluxo
                                                    ? "bg-amber-500"
                                                    : "bg-[#00338d]"
                                              }`}
                                            />
                                          ) : null}
                                          {autorizacaoConcluida ? (
                                            <span
                                              aria-hidden="true"
                                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[0.72rem] text-white"
                                            >
                                              {"\u2713"}
                                            </span>
                                          ) : null}
                                          {faltouConsulta
                                            ? "Consulta não realizada"
                                            : tokenEnviadoNoFluxo && !autorizacaoConcluida
                                              ? "AGUARDANDO SEU TOKEN"
                                              : autorizacaoConcluida
                                                ? "Atendimento liberado"
                                                : formatarStatus(consulta.statusAgendamento)}
                                        </p>
                                        </div>
                                      ) : null}
                                      {tokenInlineVisivel ? (
                                        <div className="min-w-0 text-left">
                                          <p className="truncate text-[1.55rem] font-black uppercase tracking-[0.03em] text-slate-900 md:text-[1.95rem]">
                                            {`${consulta.profissionalNome} - ${consulta.especialidadeNome}`}
                                          </p>
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className={`flex min-h-0 flex-1 flex-col text-center ${tokenInlineVisivel ? "gap-1 pb-1" : "gap-3 pb-1"}`}>

                                      {cardConsulta.agrupadoUltrassom ? (
                                        <p className={`${tokenInlineVisivel ? "mt-2 text-[2.05rem] md:mt-3 md:text-[2.35rem]" : "mt-5 text-[2.6rem] md:mt-7 md:text-[3.2rem]"} font-black uppercase tracking-[0.07em] text-[#00338d]`}>
                                          {obterFaixaHorariosConsultas(cardConsulta.consultasRelacionadas) || "Horários do dia"}
                                        </p>
                                      ) : (
                                        <p className={`${tokenInlineVisivel ? "text-[4.25rem] md:text-[5.1rem]" : "text-[5rem] md:text-[5.9rem]"} font-black tracking-tight text-[#00338d]`}>
                                          {formatarHora(consulta.horaInicio)}
                                        </p>
                                      )}

                                      {tokenInlineVisivel ? null : (
                                        <ConsultaProfissionalResumoCard
                                          profissionalNome={consulta.profissionalNome}
                                          especialidadeNome={consulta.especialidadeNome}
                                          autorizacaoConcluida={autorizacaoConcluida}
                                        />
                                      )}
                                    </div>
                                    {autorizacaoConcluida ? null : processandoSenha ? (
                                      <AutorizacaoPreparandoCard
                                        profissionalNome={consulta.profissionalNome}
                                        especialidadeNome={consulta.especialidadeNome}
                                      />
                                    ) : tokenInlineVisivel ? (
                                      <TokenInlinePanel
                                        consulta={consulta}
                                        tokenDigitado={tokenDigitado}
                                        tokenErro={tokenErro}
                                        tokenFeedback={tokenFeedback}
                                        tecladoTokenAberto={tecladoTokenAberto}
                                        reenviandoToken={reenviandoToken}
                                        validandoToken={validandoToken}
                                        segundosRestantesReenvio={segundosRestantesReenvio}
                                        onTokenChange={(indiceToken, valor) =>
                                          atualizarTokenDigitadoInline(consulta.idEvento, indiceToken, valor)
                                        }
                                        onTokenKeyDown={(indiceToken, event) =>
                                          handleTokenInlineKeyDown(consulta.idEvento, indiceToken, event)
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
                                        onLimparToken={() => limparTokenViaTecladoInline(consulta.idEvento)}
                                        onApagarUltimoDigito={() =>
                                          apagarUltimoDigitoViaTecladoInline(consulta.idEvento)
                                        }
                                        onReenviar={() => void reenviarTokenInline(consulta)}
                                        onValidar={() => void validarTokenInline(consulta)}
                                      />
                                    ) : podeSeguir ? (
                                      <button
                                        onClick={() => void abrirEtapaSenha(consulta)}
                                        className="mt-3 h-14 shrink-0 bg-[#00338d] px-4 text-[1rem] font-black text-white shadow-[0_10px_20px_rgba(0,51,141,0.16)] transition hover:bg-[#00286f] md:text-[1.08rem]"
                                      >
                                        INICIAR CONSULTA
                                      </button>
                                    ) : (
                                      <div
                                        className={`flex h-14 shrink-0 items-center justify-center px-3 text-center text-[0.94rem] font-bold ${
                                          faltouConsulta ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {faltouConsulta ? "Atendimento encerrado" : "Atendimento indisponï¿½vel"}
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
                      onVoltar={() => setIndiceConsultaAtual((valorAtual) => Math.max(valorAtual - 1, 0))}
                      onAvancar={() =>
                        setIndiceConsultaAtual((valorAtual) => Math.min(valorAtual + 1, indiceMaximoLiberado))
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
                    <p className="mt-2 text-[0.95rem] text-blue-100">
                      {"Confira o atendimento. A senha do painel ser\u00e1 gerada e vinculada automaticamente antes de seguir, para autoriza\u00e7\u00e3o."}
                    </p>
                       <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">
                        {dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----" ? dataConsultasCabecalho : "Data do atendimento"}
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

                  <SenhaAutorizacaoAcoes
                    autorizado={consultaSelecionada.autorizado}
                    tokenValidado={consultaSelecionada.tokenValidado}
                    senhaPainel={consultaSelecionada.senhaPainel}
                    onVincularSenha={() => void vincularSenhaPainel(consultaSelecionada)}
                    onConfirmarToken={() => void abrirValidacaoTokenDireta(consultaSelecionada)}
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
            onAfterFlow={() => finalizarFluxoTokenInline(consultaAutorizacaoAberta.idEvento)}
            iniciarAutomaticamente={iniciarAutorizacaoAutomaticamente}
            abrirTokenInlineAposEnvio={abrirTokenInlineAposEnvio}
          />
        )}

      </main>

    </div>
  );
};

export default BeneficiarioAutoAtendimento;
















































































































