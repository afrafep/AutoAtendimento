"use client";

import type { AgendaEvento } from "../../types/agenda";
import type { ConsultaAutoAtendimento } from "./autoatendimentoTypes";

export const CHAVE_ESTADO_TELA = "beneficiario:autoatendimento:estado-tela";
export const TEMPO_INATIVIDADE_MS = 60 * 1000;
export const TEMPO_RETORNO_TELA_CPF_MS = 60 * 1000;
export const CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS = 20;
export const CONTAGEM_ENCERRAMENTO_AUTOMATICO_SEGUNDOS = 0;
export const BLOQUEIO_REENVIO_TOKEN_MS = 23 * 1000;
export const LIMITE_INTERVALO_ULTRASSOM_MINUTOS = 60;

export interface EstadoTelaPersistido {
  cpf: string;
  pacienteNome: string;
  consultas: ConsultaAutoAtendimento[];
  etapaTela: "cpf" | "consultas";
}

export type EtapaTelaAutoAtendimento =
  | "boasVindas"
  | "cpf"
  | "consultas"
  | "senha";

export type LocalProfissionalDia = {
  idProfissional?: number | string;
  nomeLocal?: string;
  nrLocal?: string;
  status?: string;
  data?: string;
  periodo?: string;
};

export type TokenFeedbackInline = {
  tipo: "info" | "success" | "error";
  mensagem: string;
};

export const normalizarCpf = (valor?: string) =>
  String(valor || "").replace(/\D/g, "");

export const obterTextoAguardarChamada = (sexo?: string | null) => {
  const sexoNormalizado = String(sexo || "").trim().toUpperCase();

  if (sexoNormalizado === "F") {
    return "Aguarde ser chamada no painel.";
  }

  if (sexoNormalizado === "M") {
    return "Aguarde ser chamado no painel.";
  }

  return "Aguarde ser chamado(a) no painel.";
};

const cpfPossuiDigitosRepetidos = (cpf: string) => /^(\d)\1{10}$/.test(cpf);

export const validarCpf = (valor?: string) => {
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

export const formatarCpf = (valor?: string) => {
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

export const normalizarBoolean = (valor: unknown) => {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase();
  if (texto === "1" || texto === "true") return true;
  if (texto === "0" || texto === "false") return false;
  return Boolean(valor);
};

export const formatarHora = (hora?: string) =>
  String(hora || "").slice(0, 5) || "--:--";

export const formatarStatus = (status?: string) => {
  const statusSeguro = String(status || "").trim();
  return statusSeguro || "NÃO INFORMADO";
};

export const formatarData = (data?: string) => {
  if (!data) return "--/--/----";
  const [ano, mes, dia] = String(data).split("T")[0].split("-");
  if (!ano || !mes || !dia) return "--/--/----";
  return `${dia}/${mes}/${ano}`;
};

export const formatarDataAtual = () => {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = String(hoje.getFullYear());
  return `${dia}/${mes}/${ano}`;
};

export const formatarHoraAtual = () => {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

export const ordenarPorHora = (consultas: ConsultaAutoAtendimento[]) =>
  [...consultas].sort((a, b) =>
    String(a.horaInicio || "").localeCompare(String(b.horaInicio || "")),
  );

export const converterHoraParaMinutos = (hora?: string | null) => {
  const horaFormatada = String(hora || "").trim();
  if (!horaFormatada) return null;

  const partes = horaFormatada.split(":");
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;

  return horas * 60 + minutos;
};

export const ehMedicoUltrassonografista = (
  consulta: ConsultaAutoAtendimento,
) =>
  String(consulta.especialidadeNome || "")
    .trim()
    .toUpperCase()
    .includes("MEDICO ULTRASSONOGRAFISTA");

export const obterExecutanteConsulta = (consulta: ConsultaAutoAtendimento) =>
  String(
    consulta.idProfissionalRealizaProcedimento || consulta.idProfissional || "",
  );

export const obterFaixaHorariosConsultas = (
  consultas: ConsultaAutoAtendimento[],
) => {
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

  return `${horarioInicial} até ${horarioFinal}`;
};

export const criarEventoBaseDaConsulta = (
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

export const lerEstadoTelaPersistido = (): EstadoTelaPersistido | null => {
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

export const salvarEstadoTelaPersistido = (estado: EstadoTelaPersistido) => {
  try {
    sessionStorage.setItem(CHAVE_ESTADO_TELA, JSON.stringify(estado));
  } catch {}
};

export const limparEstadoTelaPersistido = () => {
  try {
    sessionStorage.removeItem(CHAVE_ESTADO_TELA);
  } catch {}
};

export const toSafeTokenString = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(
      obj.value ?? obj.codigo ?? obj.id ?? obj.numero ?? obj.sigla ?? "",
    ).trim();
  }
  return String(value).trim();
};

export const toSafeTokenNumber = (value: unknown) => {
  const normalized = toSafeTokenString(value);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const resolveNumeroGuiaOperadoraInline = (
  senhaGuia: unknown,
  numeroGuiaOperadora: unknown,
) => {
  const numeroDireto = toSafeTokenNumber(numeroGuiaOperadora);
  if (numeroDireto > 0) return numeroDireto;

  const senhaComoNumero = toSafeTokenNumber(senhaGuia);
  if (senhaComoNumero > 0) return senhaComoNumero;

  return 0;
};

export const possuiGuiaGerada = (numeroGuiaGerado: unknown) =>
  numeroGuiaGerado != null && String(numeroGuiaGerado).trim() !== "";

export const possuiSenhaAutorizacao = (senhaAutorizacao: unknown) =>
  senhaAutorizacao != null && String(senhaAutorizacao).trim() !== "";

export const extrairRetornoApiToken = (data: any) => ({
  status: toSafeTokenString(data?.status),
  mensagem: toSafeTokenString(data?.mensagem || data?.message || data?.error),
});

export const normalizarMensagemTokenInline = (mensagem?: string) => {
  const texto = toSafeTokenString(mensagem);
  const textoLower = texto.toLowerCase();

  if (
    textoLower.includes("token invalido") ||
    textoLower.includes("token inválido") ||
    textoLower.includes("ora-20400")
  ) {
    return "Token errado. Insira um token correto.";
  }

  return texto;
};
