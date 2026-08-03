const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");

function replaceOnce(search, replace) {
  if (!s.includes(search)) throw new Error("Trecho nao encontrado");
  s = s.replace(search, replace);
}

replaceOnce(
`const formatarHoraAtual = () => {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return \`${'${'}horas}:${'${'}minutos}\`;
};
`,
`const formatarHoraAtual = () => {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return \`${'${'}horas}:${'${'}minutos}\`;
};

const TEMPO_INATIVIDADE_MS = 2 * 60 * 1000;
const CONTAGEM_INATIVIDADE_SEGUNDOS = 30;

const formatarTempoSessao = (segundos: number) => {
  const totalSeguro = Math.max(0, Math.ceil(segundos));
  const minutos = Math.floor(totalSeguro / 60);
  const segundosRestantes = totalSeguro % 60;
  return \`${'${'}String(minutos).padStart(2, "0")}:${'${'}String(segundosRestantes).padStart(2, "0")}\`;
};
`
);

replaceOnce(
`  const [consultaValidandoTokenId, setConsultaValidandoTokenId] = useState<number | null>(null);
  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<number | null>(null);
`,
`  const [consultaValidandoTokenId, setConsultaValidandoTokenId] = useState<number | null>(null);
  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<number | null>(null);
  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);
  const [segundosRestantesInatividade, setSegundosRestantesInatividade] = useState(CONTAGEM_INATIVIDADE_SEGUNDOS);
  const [segundosParaExpirarSessao, setSegundosParaExpirarSessao] = useState(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));
  const timeoutInatividadeRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const intervaloInatividadeRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const intervaloSessaoRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
`
);

replaceOnce(
`  const dataCabecalhoAtual = useMemo(() => formatarDataAtual(), []);
`,
`  const dataCabecalhoAtual = useMemo(() => formatarDataAtual(), []);

  const limparTemporizadoresInatividade = () => {
    if (timeoutInatividadeRef.current) {
      window.clearTimeout(timeoutInatividadeRef.current);
      timeoutInatividadeRef.current = null;
    }

    if (intervaloInatividadeRef.current) {
      window.clearInterval(intervaloInatividadeRef.current);
      intervaloInatividadeRef.current = null;
    }

    if (intervaloSessaoRef.current) {
      window.clearInterval(intervaloSessaoRef.current);
      intervaloSessaoRef.current = null;
    }
  };

  const abrirModalInatividade = () => {
    limparTemporizadoresInatividade();
    setMostrarModalInatividade(true);
    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);
    setSegundosParaExpirarSessao(CONTAGEM_INATIVIDADE_SEGUNDOS);
    intervaloInatividadeRef.current = window.setInterval(() => {
      setSegundosRestantesInatividade((valorAtual) => Math.max(0, valorAtual - 1));
      setSegundosParaExpirarSessao((valorAtual) => Math.max(0, valorAtual - 1));
    }, 1000);
  };

  const reiniciarTemporizadorInatividade = () => {
    limparTemporizadoresInatividade();
    setMostrarModalInatividade(false);
    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);
    setSegundosParaExpirarSessao(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));
    intervaloSessaoRef.current = window.setInterval(() => {
      setSegundosParaExpirarSessao((valorAtual) => Math.max(0, valorAtual - 1));
    }, 1000);
    timeoutInatividadeRef.current = window.setTimeout(() => {
      abrirModalInatividade();
    }, TEMPO_INATIVIDADE_MS);
  };
`
);

replaceOnce(
`  useEffect(() => {
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
`,
`  useEffect(() => {
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
    if (!hidratado) return;

    const handleInteracao = () => {
      reiniciarTemporizadorInatividade();
    };

    const eventos = ["pointerdown", "touchstart", "keydown"];

    eventos.forEach((evento) => {
      window.addEventListener(evento, handleInteracao, { passive: true });
    });

    reiniciarTemporizadorInatividade();

    return () => {
      eventos.forEach((evento) => {
        window.removeEventListener(evento, handleInteracao);
      });
      limparTemporizadoresInatividade();
    };
  }, [hidratado]);

  useEffect(() => {
    if (!mostrarModalInatividade) return;

    if (segundosRestantesInatividade <= 0) {
      setMostrarModalInatividade(false);
      resetarTelaCpf();
    }
  }, [mostrarModalInatividade, segundosRestantesInatividade]);
`
);

replaceOnce(
`  const resetarTelaCpf = () => {
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
`,
`  const resetarTelaCpf = () => {
    limparTemporizadoresInatividade();
    setMostrarModalInatividade(false);
    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);
    setSegundosParaExpirarSessao(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));
    setCpf("");
    setPacienteNome("");
    setConsultas([]);
    setConsultaProcessandoSenhaId(null);
    setConsultaAutorizacaoAberta(null);
    setIniciarAutorizacaoAutomaticamente(false);
    setAbrirTokenInlineAposEnvio(false);
    setConsultaSelecionadaId(null);
    setIndiceConsultaAtual(0);
    setConsultaTokenAbertaId(null);
    setConsultaReenviandoTokenId(null);
    setConsultaValidandoTokenId(null);
    setConsultaTecladoTokenId(null);
    setTokenDigitadoPorConsulta({});
    setTokenErroPorConsulta({});
    setTokenFeedbackPorConsulta({});
    setSenhasPainelDigitadas({});
    setMostrarTecladoCpf(false);
    setEtapaTela("cpf");
    limparEstadoTelaPersistido();
    window.setTimeout(() => {
      reiniciarTemporizadorInatividade();
    }, 0);
  };
`
);

replaceOnce(
`                  <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[minmax(0,1fr)_210px] md:items-center">
                    <div className="min-w-0 text-center md:text-left">
                      <p className="text-[0.98rem] font-black uppercase tracking-[0.18em] text-blue-100/85 md:text-[1.08rem]">
                        Atendimentos do dia
                      </p>
                      <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">
                        {pacienteNome || "Benefici\u00e1rio"}
                      </h2>
                      <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">
                        {dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----" ? dataConsultasCabecalho : "Data do atendimento"}
                      </p>
                    </div>
                    <div className="flex min-h-0 h-full flex-col gap-3">
`,
`                  <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[minmax(0,1fr)_230px_210px] md:items-center">
                    <div className="min-w-0 text-center md:text-left">
                      <p className="text-[0.98rem] font-black uppercase tracking-[0.18em] text-blue-100/85 md:text-[1.08rem]">
                        Atendimentos do dia
                      </p>
                      <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">
                        {pacienteNome || "Benefici\u00e1rio"}
                      </h2>
                      <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">
                        {dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----" ? dataConsultasCabecalho : "Data do atendimento"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="inline-flex min-h-[84px] min-w-[220px] flex-col items-center justify-center rounded-[1.25rem] border border-white/20 bg-white/10 px-5 py-3 text-center text-white shadow-[0_14px_24px_rgba(15,23,42,0.14)]">
                        <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-blue-100/85 md:text-[0.78rem]">
                          SESSÃO EXPIRA EM
                        </p>
                        <p className="mt-2 text-[1.6rem] font-black tracking-[0.05em] text-white md:text-[1.9rem]">
                          {formatarTempoSessao(segundosParaExpirarSessao)}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-h-0 h-full flex-col gap-3">
`
);

replaceOnce(
`              <p className="mt-3 text-[1rem] font-medium text-slate-600 md:text-[1.12rem]">
                O autoatendimento será encerrado automaticamente por falta de interação.
              </p>
              <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-[0.86rem] font-black uppercase tracking-[0.12em] text-amber-700 md:text-[0.94rem]">
                  ATENDIMENTO SERÁ ENCERRADO EM
                </p>
                <p className="mt-2 text-[2.5rem] font-black tracking-tight text-amber-600 md:text-[3rem]">
                  {segundosRestantesInatividade}s
                </p>
              </div>
`,
`              <p className="mt-3 text-[1rem] font-medium text-slate-600 md:text-[1.12rem]">
                Sua sessão expira em instantes por falta de interação.
              </p>
              <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-[0.86rem] font-black uppercase tracking-[0.12em] text-amber-700 md:text-[0.94rem]">
                  SUA SESSÃO EXPIRA EM
                </p>
                <p className="mt-2 text-[2.5rem] font-black tracking-tight text-amber-600 md:text-[3rem]">
                  {formatarTempoSessao(segundosRestantesInatividade)}
                </p>
              </div>
`
);

replaceOnce(
`        {consultaAutorizacaoAberta && (
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
`,
`        {consultaAutorizacaoAberta && (
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

        {mostrarModalInatividade && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4">
            <div className="w-full max-w-2xl rounded-[1.6rem] border border-white/70 bg-white p-6 text-center shadow-[0_24px_48px_rgba(15,23,42,0.28)] md:p-8">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-[2.4rem] font-black text-amber-600 md:h-28 md:w-28 md:text-[2.8rem]">
                !
              </div>
              <h3 className="mt-5 text-[1.6rem] font-black uppercase tracking-[0.03em] text-slate-900 md:text-[2rem]">
                VOCÊ AINDA ESTÁ AÍ?
              </h3>
              <p className="mt-3 text-[1rem] font-medium text-slate-600 md:text-[1.12rem]">
                Sua sessão expira em instantes por falta de interação.
              </p>
              <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-[0.86rem] font-black uppercase tracking-[0.12em] text-amber-700 md:text-[0.94rem]">
                  SUA SESSÃO EXPIRA EM
                </p>
                <p className="mt-2 text-[2.5rem] font-black tracking-tight text-amber-600 md:text-[3rem]">
                  {formatarTempoSessao(segundosRestantesInatividade)}
                </p>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => reiniciarTemporizadorInatividade()}
                  className="h-14 rounded-[1rem] bg-emerald-600 px-5 text-[1rem] font-black uppercase text-white shadow-[0_14px_26px_rgba(5,150,105,0.22)] transition hover:bg-emerald-500"
                >
                  CONTINUAR
                </button>
                <button
                  type="button"
                  onClick={() => resetarTelaCpf()}
                  className="h-14 rounded-[1rem] border border-red-200 bg-red-50 px-5 text-[1rem] font-black uppercase text-red-700 transition hover:bg-red-100"
                >
                  ENCERRAR AGORA
                </button>
              </div>
            </div>
          </div>
        )}
`
);

fs.writeFileSync(path, s, "utf8");
