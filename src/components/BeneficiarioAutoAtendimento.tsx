"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { TokenEnviar } from "./TokenEnviar";
import { TokenValidar } from "./TokenValidar";
import SessaoExpiracaoCard from "./beneficiario/SessaoExpiracaoCard";
import TokenErroModal from "./beneficiario/TokenErroModal";
import BeneficiarioCpfScreen from "./beneficiario/BeneficiarioCpfScreen";
import BeneficiarioConsultasScreen from "./beneficiario/BeneficiarioConsultasScreen";
import BeneficiarioSenhaScreen from "./beneficiario/BeneficiarioSenhaScreen";
import ConsultaFluxoAtualPanel from "./beneficiario/ConsultaFluxoAtualPanel";
import ModalAutorizacaoBeneficiario from "./beneficiario/ModalAutorizacaoBeneficiario";
import type {
  ConsultaAutoAtendimento,
  ConsultaCardAgrupado,
  ConsultaFluxoItem,
  TokenErroModalState,
} from "./beneficiario/autoatendimentoTypes";
import { api } from "../config/configApi";
import { inteliteSenhaService } from "../services/inteliteSenhaService";
import type { AgendaEvento } from "../types/agenda";

const normalizarCpf = (valor?: string) =>
  String(valor || "").replace(/\D/g, "");

const obterTextoAguardarChamada = (sexo?: string | null) => {
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

const formatarHoraAtual = () => {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

const TEMPO_INATIVIDADE_MS = 60 * 1000;
const TEMPO_RETORNO_TELA_CPF_MS = 60 * 1000;
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

  return `${horarioInicial} até ${horarioFinal}`;
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
    textoLower.includes("token inválido") ||
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
  const [consultaErroToastAtivoId, setConsultaErroToastAtivoId] = useState<
    number | null
  >(null);
  const [tokenErroModal, setTokenErroModal] =
    useState<TokenErroModalState | null>(null);
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
  const timeoutTelaCpfRef = useRef<number | null>(null);
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

  const cardsConsultasFluxo = useMemo<ConsultaFluxoItem[]>(
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
      const statusAtual = String(
        item.consulta.statusAgendamento || "",
      ).toUpperCase();
      const podeAvancarMesmoSemConclusao =
        statusAtual === "ATENDIDO" || statusAtual === "FALTOU";

      if (item.autorizacaoConcluida || podeAvancarMesmoSemConclusao) {
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

  const mensagemFluxoConsultas = useMemo(() => {
    const totalConsultas = cardsConsultasFluxo.length;
    const consultaAtual = consultaFluxoAtual;
    const isAutorizada = consultaAtual?.autorizacaoConcluida;
    const isUltimaConsulta = indiceConsultaAtual === totalConsultas - 1;
    const statusConsultaAtual = String(
      consultaAtual?.consulta.statusAgendamento || "",
    ).toUpperCase();
    const consultaAtendida = statusConsultaAtual === "ATENDIDO";

    if (totalConsultas === 1) {
      return isAutorizada
        ? "✅ Consulta autorizada, aguarde para ser atendido!"
        : "Finalize o autoatendimento para liberar sua consulta.";
    }

    if (isUltimaConsulta) {
      return isAutorizada
        ? "✅ Todas as consultas autorizadas! Aguarde o atendimento."
        : "Finalize o autoatendimento para liberar a última consulta.";
    }

    if (consultaAtendida) {
      return "✅ Autorizado(Aptools) e próxima consulta liberada";
    }

    return isAutorizada
      ? "✅ Autorizado. Consulta liberada."
      : "Finalize o autoatendimento para liberar a próxima consulta.";
  }, [cardsConsultasFluxo.length, consultaFluxoAtual, indiceConsultaAtual]);
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

  const limparTemporizadorTelaCpf = () => {
    if (timeoutTelaCpfRef.current) {
      window.clearTimeout(timeoutTelaCpfRef.current);
      timeoutTelaCpfRef.current = null;
    }
  };

  const voltarParaTelaInicialCpf = () => {
    limparTemporizadorTelaCpf();
    setCpf("");
    setMostrarTecladoCpf(false);
    setMostrarTelaBoasVindasCpf(true);
    setAnimandoSaidaTelaBoasVindasCpf(false);
  };

  const reiniciarTemporizadorTelaCpf = () => {
    limparTemporizadorTelaCpf();

    if (etapaTela !== "cpf" || mostrarTelaBoasVindasCpf) {
      return;
    }

    timeoutTelaCpfRef.current = window.setTimeout(() => {
      voltarParaTelaInicialCpf();
    }, TEMPO_RETORNO_TELA_CPF_MS);
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
    if (etapaTela !== "consultas" || !consultaFluxoAtual) {
      return;
    }

    const { consulta, autorizacaoConcluida } = consultaFluxoAtual;
    const deveExibirToken =
      !autorizacaoConcluida &&
      consulta.erroAutorizacao !== true &&
      (consultaProcessandoSenhaId === consulta.idEvento ||
        consultaTokenAbertaId === consulta.idEvento ||
        normalizarBoolean(consulta.autorizado));

    if (!deveExibirToken) {
      if (consultaTecladoTokenId === consulta.idEvento) {
        setConsultaTecladoTokenId(null);
      }
      return;
    }

    if (consultaTecladoTokenId !== consulta.idEvento) {
      abrirTecladoTokenInline(consulta.idEvento);
    }
  }, [
    etapaTela,
    consultaFluxoAtual,
    consultaProcessandoSenhaId,
    consultaTecladoTokenId,
    consultaTokenAbertaId,
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

  useEffect(() => {
    if (!hidratado) return;

    if (etapaTela !== "cpf" || mostrarTelaBoasVindasCpf) {
      limparTemporizadorTelaCpf();
      return;
    }

    reiniciarTemporizadorTelaCpf();

    return () => {
      limparTemporizadorTelaCpf();
    };
  }, [hidratado, etapaTela, mostrarTelaBoasVindasCpf]);

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
    limparTemporizadorTelaCpf();
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
    setConsultaErroToastAtivoId(null);
    setTokenErroModal(null);
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
          "Não encontramos a senha da guia para reenviar o token.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "Não encontramos a senha da guia para reenviar o token.",
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
            "Não foi possível reenviar o token agora.",
        }));
        await exibirModalErroTokenInline(
          consulta.idEvento,
          "Não foi possível reenviar o token agora.",
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
        "Token reenviado com sucesso. Veja o novo código no celular.",
      );
      await Swal.fire({
        title: "TOKEN REENVIADO",
        text: "Um novo código foi enviado para o seu celular, pelo aplicativo ou por SMS.",
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
          "Não foi possível reenviar o token agora.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "Não foi possível reenviar o token agora.",
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
      mensagemNormalizada.toLowerCase() === "token inválido" ||
      mensagemNormalizada.toLowerCase() === "token invalido"
        ? "TOKEN INVÁLIDO"
        : "ERRO AO VALIDAR TOKEN";

    const descricao =
      titulo === "TOKEN INVÁLIDO"
        ? "Token errado. Insira um token correto."
        : mensagemNormalizada || "Não foi possível validar o token.";

    if (titulo === "TOKEN INVÁLIDO") {
      setTokenDigitadoPorConsulta((prev) => ({
        ...prev,
        [idEvento]: "",
      }));
    }

    setConsultaErroToastAtivoId(idEvento);
    setTokenErroModal({ idEvento, titulo, descricao });
    await Promise.resolve();
  };

  const fecharModalErroTokenInline = () => {
    if (!tokenErroModal) {
      return;
    }

    const { idEvento } = tokenErroModal;
    setConsultaErroToastAtivoId((atual) => (atual === idEvento ? null : atual));
    setTokenErroModal(null);
    setTimeout(() => focarCampoTokenInline(idEvento, 0), 0);
  };

const exibirModalSucessoELiberarConsulta = async (consulta: ConsultaAutoAtendimento) => {
  const textoAguardarChamada = obterTextoAguardarChamada(consulta.flSexo);

  await Swal.fire({
    title: "✅ ATENDIMENTO LIBERADO!",
    html: `
      <div style="text-align: center; padding: 12px 0 8px;">
        <p style="font-size: 2.2rem; line-height: 1.15; margin-bottom: 18px;"><strong>${consulta.pacienteNome}</strong></p>
        <p style="color: #475569; font-size: 1.8rem; line-height: 1.26; margin-bottom: 10px;">📋 ${consulta.profissionalNome}</p>
        <p style="color: #475569; font-size: 1.68rem; line-height: 1.26; margin-bottom: 10px;">🏥 ${consulta.especialidadeNome}</p>
        <p style="color: #00338d; font-weight: bold; font-size: 2.2rem; margin-top: 14px; margin-bottom: 12px;">
          🕐 ${formatarHora(consulta.horaInicio)}
        </p>
        <p style="color: #64748b; font-size: 2rem; font-weight: 800; line-height: 1.18; margin-top: 14px;">
          ${textoAguardarChamada}
        </p>
      </div>
    `,
    icon: "success",
    confirmButtonText: "OK, ENTENDI",
    allowOutsideClick: false,
    background: "#ffffff",
    color: "#0f172a",
    customClass: {
      popup:
        "!rounded-[1.75rem] !w-[min(92vw,56rem)] !max-w-[56rem] !px-10 !py-8 !flex !flex-col !justify-center",
      title: "!text-[2.85rem] !leading-tight !font-black !text-emerald-700",
      confirmButton:
        "!bg-emerald-600 !text-white !font-black !rounded-[1rem] !px-12 !py-4 !text-[1.35rem] !mt-5",
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
        "Não encontramos a senha da guia para validar o token.",
    }));
    await exibirModalErroTokenInline(
      consulta.idEvento,
      "Não encontramos a senha da guia para validar o token.",
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
        mensagem || "Não foi possível validar o token informado.";
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
      mensagemErro.includes("token inválido") ||
      mensagemErro.includes("ora-20400");
    const tokenJaConfirmado =
      mensagemErro.includes("senha ja validada com envio de token") ||
      mensagemErro.includes("senha já validada com envio de token") ||
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
        "Não foi possível gerar e vincular a senha deste atendimento.",
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
    reiniciarTemporizadorTelaCpf();

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
    reiniciarTemporizadorTelaCpf();

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
    reiniciarTemporizadorTelaCpf();

    if (normalizarCpf(cpfFormatado).length === 11) {
      void buscarConsultas(cpfFormatado);
    }
  };

  const apagarUltimoDigitoCpf = () => {
    const cpfAtual = normalizarCpf(cpf);
    setCpf(formatarCpf(cpfAtual.slice(0, -1)));
    reiniciarTemporizadorTelaCpf();
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
        String(consulta.localidadePainel || "Não informado").trim() || null
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
        String(consulta.localidadePainel || "Não informado").trim() ||
        null
      );
    } catch (error) {
      console.warn(
        "Não foi possível consultar o local do profissional:",
        error,
      );
      return (
        String(consulta.localidadePainel || "Não informado").trim() || null
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
            "Não foi possível carregar o local do profissional:",
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
        "Tipo de atendimento Intelite inválido para emissão.",
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
      throw new Error("A Intelite não retornou a senha emitida.");
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
      "Não informado";

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
        "Não foi possível vincular a senha deste atendimento.",
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
        title: "Atenção",
        html: "Digite um CPF válido.<br />Sequências como Ex: 111.111.111-11 não são permitidas.",
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
              "Profissional não informado",
            especialidadeNome:
              item.profissional?.especialidade?.dsEspecialidade ||
              "Especialidade não informada",
            pacienteNome:
              item.paciente?.nmPaciente ||
              "Beneficiário não informado",
            flSexo: item.paciente?.flSexo ?? null,
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
          "Erro ao atualizar comparecimento antes da autorização:",
          error,
        );
        await Swal.fire(
          "Erro",
          "Não foi possível atualizar o comparecimento antes da autorização.",
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

        <TokenErroModal
          tokenErroModal={tokenErroModal}
          onClose={fecharModalErroTokenInline}
        />

        <SessaoExpiracaoCard
          mostrarModalInatividade={mostrarModalInatividade}
          segundosRestantesInatividade={segundosRestantesInatividade}
          formatarTempoSessao={formatarTempoSessao}
          onContinuar={reiniciarTemporizadorSessao}
        />

        <div className="flex w-full flex-1 transition-all duration-200">
          {etapaTela === "cpf" && (
            <BeneficiarioCpfScreen
              mostrarTelaBoasVindasCpf={mostrarTelaBoasVindasCpf}
              animandoSaidaTelaBoasVindasCpf={animandoSaidaTelaBoasVindasCpf}
              abrirEntradaCpf={abrirEntradaCpf}
              dataCabecalhoAtual={dataCabecalhoAtual}
              horaCabecalhoAtual={horaCabecalhoAtual}
              inputCpfRef={inputCpfRef}
              cpf={cpf}
              handleCpfChange={handleCpfChange}
              handleCpfKeyDown={handleCpfKeyDown}
              handleCpfPaste={handleCpfPaste}
              buscarConsultas={buscarConsultas}
              setMostrarTecladoCpf={setMostrarTecladoCpf}
              mostrarTecladoCpf={mostrarTecladoCpf}
              loading={loading}
              adicionarDigitoCpf={adicionarDigitoCpf}
              apagarUltimoDigitoCpf={apagarUltimoDigitoCpf}
            />
          )}

          {etapaTela === "consultas" && (
            <BeneficiarioConsultasScreen
              pacienteNome={pacienteNome}
              dataConsultasCabecalho={dataConsultasCabecalho}
              onSair={() => void confirmarEncerramentoAutoAtendimento()}
              mensagemFluxo={mensagemFluxoConsultas}
              totalConsultas={cardsConsultasFluxo.length}
              indiceConsultaAtual={indiceConsultaAtual}
              indiceMaximoLiberado={indiceMaximoLiberado}
              setIndiceConsultaAtual={setIndiceConsultaAtual}
            >
              <ConsultaFluxoAtualPanel
                consultaFluxoAtual={consultaFluxoAtual}
                consultaProcessandoSenhaId={consultaProcessandoSenhaId}
                consultaTokenAbertaId={consultaTokenAbertaId}
                tokenDigitadoPorConsulta={tokenDigitadoPorConsulta}
                consultaReenviandoTokenId={consultaReenviandoTokenId}
                consultaValidandoTokenId={consultaValidandoTokenId}
                consultaErroToastAtivoId={consultaErroToastAtivoId}
                consultaTecladoTokenId={consultaTecladoTokenId}
                bloqueioReenvioAtePorConsulta={bloqueioReenvioAtePorConsulta}
                agoraReenvioToken={agoraReenvioToken}
                formatarHora={formatarHora}
                formatarStatus={formatarStatus}
                obterFaixaHorariosConsultas={obterFaixaHorariosConsultas}
                atualizarTokenDigitadoInline={atualizarTokenDigitadoInline}
                handleTokenInlineKeyDown={handleTokenInlineKeyDown}
                handleTokenInlinePaste={handleTokenInlinePaste}
                abrirTecladoTokenInline={abrirTecladoTokenInline}
                fecharTecladoTokenInline={fecharTecladoTokenInline}
                preencherTokenViaTecladoInline={preencherTokenViaTecladoInline}
                limparTokenViaTecladoInline={limparTokenViaTecladoInline}
                reenviarTokenInline={reenviarTokenInline}
                validarTokenInline={validarTokenInline}
                abrirEtapaSenha={abrirEtapaSenha}
              />
            </BeneficiarioConsultasScreen>
          )}
          {etapaTela === "senha" && consultaSelecionada && (
            <BeneficiarioSenhaScreen
              consultaSelecionada={consultaSelecionada}
              dataConsultasCabecalho={dataConsultasCabecalho}
              formatarData={formatarData}
              formatarHora={formatarHora}
              senhaPainelDigitada={
                senhasPainelDigitadas[consultaSelecionada.idEvento] ?? ""
              }
              atualizarTextoSenhaPainel={atualizarTextoSenhaPainel}
              vincularSenhaPainel={vincularSenhaPainel}
              abrirValidacaoTokenDireta={abrirValidacaoTokenDireta}
              voltarParaConsultas={voltarParaConsultas}
            />
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
            criarEventoBaseDaConsulta={criarEventoBaseDaConsulta}
            formatarData={formatarData}
            formatarHora={formatarHora}
          />
        )}
      </main>
    </div>
  );
};

export default BeneficiarioAutoAtendimento;
