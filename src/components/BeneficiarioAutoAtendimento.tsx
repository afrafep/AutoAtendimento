"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { TokenEnviar } from "./TokenEnviar";
import { TokenValidar } from "./TokenValidar";
import BeneficiarioEtapaContent from "./beneficiario/BeneficiarioEtapaContent";
import BeneficiarioAutorizacaoModalHost from "./beneficiario/BeneficiarioAutorizacaoModalHost";
import BeneficiarioOverlayHost from "./beneficiario/BeneficiarioOverlayHost";
import {
  buscarLocalidadePainelDoProfissional,
  emitirSenhaPainelAutomaticamente,
  preencherLocaisDasConsultas,
} from "./beneficiario/beneficiarioAutoAtendimentoAgendaHelpers";
import { createTokenInlineActions } from "./beneficiario/beneficiarioAutoAtendimentoTokenActions";
import {
  BLOQUEIO_REENVIO_TOKEN_MS,
  CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS,
  CONTAGEM_ENCERRAMENTO_AUTOMATICO_SEGUNDOS,
  criarEventoBaseDaConsulta,
  ehMedicoUltrassonografista,
  EtapaTelaAutoAtendimento,
  extrairRetornoApiToken,
  formatarCpf,
  formatarData,
  formatarDataAtual,
  formatarHora,
  formatarHoraAtual,
  formatarStatus,
  LIMITE_INTERVALO_ULTRASSOM_MINUTOS,
  lerEstadoTelaPersistido,
  limparEstadoTelaPersistido,
  LocalProfissionalDia,
  normalizarBoolean,
  normalizarCpf,
  obterExecutanteConsulta,
  obterFaixaHorariosConsultas,
  ordenarPorHora,
  possuiGuiaGerada,
  possuiSenhaAutorizacao,
  salvarEstadoTelaPersistido,
  TEMPO_INATIVIDADE_MS,
  TEMPO_RETORNO_TELA_CPF_MS,
  TokenFeedbackInline,
  converterHoraParaMinutos,
  validarCpf,
} from "./beneficiario/autoatendimentoHelpers";
import type {
  ConsultaAutoAtendimento,
  ConsultaCardAgrupado,
  ConsultaFluxoItem,
  TokenErroModalState,
} from "./beneficiario/autoatendimentoTypes";
import { api } from "../config/configApi";

// Orquestra o fluxo completo do kiosk: identificação por CPF, listagem das consultas,
// emissão/vínculo de senha, autorização e validação de token.
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

  // Agrupa consultas em cards de navegação. Ultrassons próximos do mesmo executante
  // são exibidos juntos para reduzir etapas repetidas no autoatendimento.
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

  // Define até onde o usuário pode avançar no fluxo com base no que já foi concluído.
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

  // Gera a mensagem contextual exibida no topo conforme o progresso do atendimento.
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

    if (consultaAtendida && !isAutorizada) {
      return "✅ Autorizado(Aptools) e próxima consulta liberada";
    }

    return isAutorizada
      ? "✅ Autorizado. Consulta liberada."
      : "Finalize o autoatendimento para liberar a próxima consulta.";
  }, [cardsConsultasFluxo.length, consultaFluxoAtual, indiceConsultaAtual]);
  const dataCabecalhoAtual = useMemo(() => formatarDataAtual(), []);

  // Converte o contador de inatividade para o formato mm:ss exibido no modal.
  const formatarTempoSessao = (segundos: number) => {
    const totalSegundos = Math.max(0, segundos);
    const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
    const segundosRestantes = String(totalSegundos % 60).padStart(2, "0");
    return `${minutos}:${segundosRestantes}`;
  };

  // Garante que apenas um ciclo de contagem de inatividade fique ativo por vez.
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

  // Na tela de CPF, volta para a tela inicial caso o usuário abandone a digitação.
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

  // Controla a sessão ativa após sair do CPF, exibindo aviso e encerrando por inatividade.
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

  // Mantém o relógio do cabeçalho sincronizado sem recriar estado a cada render.
  useEffect(() => {
    setHoraCabecalhoAtual(formatarHoraAtual());
    const intervaloHora = window.setInterval(() => {
      setHoraCabecalhoAtual(formatarHoraAtual());
    }, 60000);

    return () => window.clearInterval(intervaloHora);
  }, []);

  // Atualiza o countdown visual do bloqueio de reenvio enquanto existir algum timer ativo.
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

  // Reidrata o fluxo salvo em sessionStorage para evitar perder a etapa atual ao recarregar.
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

  // Mantém o índice atual dentro do intervalo permitido sempre que a lista muda.
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
  // Quando uma consulta já teve envio/autorização iniciado, abre o bloqueio de reenvio.
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

  // Abre automaticamente o teclado do token quando o fluxo entra na etapa de validação.
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

  // Alguns modais interrompem a contagem de inatividade para não expulsar o usuário no meio do fluxo.
  useEffect(() => {
    pausaInatividadeRef.current = possuiModalAbertoQuePausaInatividade;

    if (possuiModalAbertoQuePausaInatividade) {
      setMostrarModalInatividade(false);
      setSegundosRestantesInatividade(
        CONTAGEM_AVISO_INATIVIDADE_SEGUNDOS,
      );
    }
  }, [possuiModalAbertoQuePausaInatividade]);

  // Escuta interações globais para reiniciar a sessão enquanto o usuário navega nas consultas.
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

  // A tela de CPF tem um timeout próprio, separado da sessão completa do autoatendimento.
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

  // Salva apenas o necessário para retomar a etapa de consultas após refresh.
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

  // Limpa todo o estado transitório do fluxo e devolve o kiosk à etapa inicial.
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

  const {
    abrirTecladoTokenInline,
    atualizarTokenDigitadoInline,
    fecharModalErroTokenInline,
    fecharTecladoTokenInline,
    finalizarFluxoTokenInline,
    handleTokenInlineKeyDown,
    handleTokenInlinePaste,
    limparMensagemTokenInline,
    limparTokenViaTecladoInline,
    preencherTokenViaTecladoInline,
    reenviarTokenInline,
    validarTokenInline,
  } = createTokenInlineActions({
    tokenDigitadoPorConsulta,
    tokenErroModal,
    setTokenDigitadoPorConsulta,
    setTokenErroPorConsulta,
    setTokenFeedbackPorConsulta,
    setConsultaReenviandoTokenId,
    setConsultaValidandoTokenId,
    setConsultaErroToastAtivoId,
    setTokenErroModal,
    setConsultaTecladoTokenId,
    setConsultaTokenAbertaId,
    setConsultaProcessandoSenhaId,
    setBloqueioReenvioAtePorConsulta,
    setAbrirTokenInlineAposEnvio,
    buscarConsultas: async () => buscarConsultas(),
    atualizarConsultaLocal: (idEvento, changes) =>
      atualizarConsultaLocal(idEvento, changes),
  });

  // Inicia o fluxo operacional da consulta: garantir senha de painel e abrir a autorização.
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

  // Atualiza somente a consulta afetada sem depender de um novo fetch imediato.
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


  // Persiste a senha/localidade no backend, valida o retorno e continua o fluxo quando necessário.
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
      (await buscarLocalidadePainelDoProfissional(
        locaisProfissionaisPorDataCacheRef,
        consulta,
      )) ||
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
  // Mantém o caminho legado de validação externa de token para consultas já autorizadas.
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

  // Busca apenas os atendimentos do dia para o CPF informado e prepara o fluxo das próximas etapas.
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
        await preencherLocaisDasConsultas(
          locaisProfissionaisPorDataCacheRef,
          consultasMapeadas,
        ),
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

  // Antes de abrir a autorização, garante que o evento esteja marcado como COMPARECEU.
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

  // Sai da tela de boas-vindas, revela o campo de CPF e entrega foco ao usuário.
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
    <div className="autoatendimento-kiosk min-h-screen bg-[linear-gradient(180deg,#eaf3ff_0%,#ffffff_28%,#eef6ff_100%)] text-slate-900">
      <main className="relative z-10 flex min-h-screen w-full flex-col">
        <div
          id="beneficiario-modal-root"
          className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
        />

        <BeneficiarioOverlayHost
          tokenErroModal={tokenErroModal}
          fecharModalErroTokenInline={fecharModalErroTokenInline}
          mostrarModalInatividade={mostrarModalInatividade}
          segundosRestantesInatividade={segundosRestantesInatividade}
          formatarTempoSessao={formatarTempoSessao}
          reiniciarTemporizadorSessao={reiniciarTemporizadorSessao}
        />

        <BeneficiarioEtapaContent
          etapaTela={etapaTela}
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
          pacienteNome={pacienteNome}
          dataConsultasCabecalho={dataConsultasCabecalho}
          confirmarEncerramentoAutoAtendimento={
            confirmarEncerramentoAutoAtendimento
          }
          mensagemFluxoConsultas={mensagemFluxoConsultas}
          cardsConsultasFluxo={cardsConsultasFluxo}
          indiceConsultaAtual={indiceConsultaAtual}
          indiceMaximoLiberado={indiceMaximoLiberado}
          setIndiceConsultaAtual={setIndiceConsultaAtual}
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
          consultaSelecionada={consultaSelecionada}
          senhaPainelDigitada={
            consultaSelecionada
              ? senhasPainelDigitadas[consultaSelecionada.idEvento] ?? ""
              : ""
          }
          formatarData={formatarData}
          atualizarTextoSenhaPainel={atualizarTextoSenhaPainel}
          vincularSenhaPainel={vincularSenhaPainel}
          abrirValidacaoTokenDireta={abrirValidacaoTokenDireta}
          voltarParaConsultas={voltarParaConsultas}
        />

        <BeneficiarioAutorizacaoModalHost
          consulta={consultaAutorizacaoAberta}
          onClose={() => {
            setConsultaAutorizacaoAberta(null);
            setIniciarAutorizacaoAutomaticamente(false);
            setAbrirTokenInlineAposEnvio(false);
          }}
          onAfterFlow={() =>
            consultaAutorizacaoAberta
              ? finalizarFluxoTokenInline(consultaAutorizacaoAberta.idEvento)
              : Promise.resolve()
          }
          iniciarAutomaticamente={iniciarAutorizacaoAutomaticamente}
          abrirTokenInlineAposEnvio={abrirTokenInlineAposEnvio}
          criarEventoBaseDaConsulta={criarEventoBaseDaConsulta}
          formatarData={formatarData}
          formatarHora={formatarHora}
        />
      </main>
    </div>
  );
};

export default BeneficiarioAutoAtendimento;