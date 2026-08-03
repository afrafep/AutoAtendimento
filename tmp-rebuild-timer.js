const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");

function mustReplace(pattern, replacer, label) {
  const before = s;
  s = s.replace(pattern, replacer);
  if (s === before) throw new Error("Falhou em: " + label);
}

if (!s.includes("const TEMPO_INATIVIDADE_MS = 2 * 60 * 1000;")) {
  mustReplace(
    /const formatarHoraAtual = \(\) => \{[\s\S]*?\n\};/,
    (m) => `${m}\n\nconst TEMPO_INATIVIDADE_MS = 2 * 60 * 1000;\nconst CONTAGEM_INATIVIDADE_SEGUNDOS = 30;\n\nconst formatarTempoSessao = (segundos: number) => {\n  const totalSeguro = Math.max(0, Math.ceil(segundos));\n  const minutos = Math.floor(totalSeguro / 60);\n  const segundosRestantes = totalSeguro % 60;\n  return \`${'${'}String(minutos).padStart(2, "0")}:${'${'}String(segundosRestantes).padStart(2, "0")}\`;\n};`,
    "constantes timer"
  );
}

if (!s.includes("const [mostrarModalInatividade")) {
  mustReplace(
    /const \[consultaTecladoTokenId, setConsultaTecladoTokenId\] = useState<number \| null>\(null\);/,
    (m) => `${m}\n  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);\n  const [segundosRestantesInatividade, setSegundosRestantesInatividade] = useState(CONTAGEM_INATIVIDADE_SEGUNDOS);\n  const [segundosParaExpirarSessao, setSegundosParaExpirarSessao] = useState(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));\n  const timeoutInatividadeRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);\n  const intervaloInatividadeRef = useRef<ReturnType<typeof window.setInterval> | null>(null);\n  const intervaloSessaoRef = useRef<ReturnType<typeof window.setInterval> | null>(null);`,
    "states timer"
  );
}

if (!s.includes("const limparTemporizadoresInatividade")) {
  mustReplace(
    /const dataCabecalhoAtual = useMemo\(\(\) => formatarDataAtual\(\), \[\]\);/,
    (m) => `${m}\n\n  const limparTemporizadoresInatividade = () => {\n    if (timeoutInatividadeRef.current) {\n      window.clearTimeout(timeoutInatividadeRef.current);\n      timeoutInatividadeRef.current = null;\n    }\n\n    if (intervaloInatividadeRef.current) {\n      window.clearInterval(intervaloInatividadeRef.current);\n      intervaloInatividadeRef.current = null;\n    }\n\n    if (intervaloSessaoRef.current) {\n      window.clearInterval(intervaloSessaoRef.current);\n      intervaloSessaoRef.current = null;\n    }\n  };\n\n  const abrirModalInatividade = () => {\n    limparTemporizadoresInatividade();\n    setMostrarModalInatividade(true);\n    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);\n    setSegundosParaExpirarSessao(CONTAGEM_INATIVIDADE_SEGUNDOS);\n    intervaloInatividadeRef.current = window.setInterval(() => {\n      setSegundosRestantesInatividade((valorAtual) => Math.max(0, valorAtual - 1));\n      setSegundosParaExpirarSessao((valorAtual) => Math.max(0, valorAtual - 1));\n    }, 1000);\n  };\n\n  const reiniciarTemporizadorInatividade = () => {\n    limparTemporizadoresInatividade();\n    setMostrarModalInatividade(false);\n    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);\n    setSegundosParaExpirarSessao(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));\n    intervaloSessaoRef.current = window.setInterval(() => {\n      setSegundosParaExpirarSessao((valorAtual) => Math.max(0, valorAtual - 1));\n    }, 1000);\n    timeoutInatividadeRef.current = window.setTimeout(() => {\n      abrirModalInatividade();\n    }, TEMPO_INATIVIDADE_MS);\n  };`,
    "helpers timer"
  );
}

if (!s.includes("segundosRestantesInatividade <= 0")) {
  mustReplace(
    /\}, \[cardsConsultasFluxo, indiceConsultaAtual, indiceMaximoLiberado\]\);/,
    (m) => `${m}\n\n  useEffect(() => {\n    if (!hidratado) return;\n\n    const handleInteracao = () => {\n      reiniciarTemporizadorInatividade();\n    };\n\n    const eventos = ["pointerdown", "touchstart", "keydown"];\n\n    eventos.forEach((evento) => {\n      window.addEventListener(evento, handleInteracao, { passive: true });\n    });\n\n    reiniciarTemporizadorInatividade();\n\n    return () => {\n      eventos.forEach((evento) => {\n        window.removeEventListener(evento, handleInteracao);\n      });\n      limparTemporizadoresInatividade();\n    };\n  }, [hidratado]);\n\n  useEffect(() => {\n    if (!mostrarModalInatividade) return;\n\n    if (segundosRestantesInatividade <= 0) {\n      setMostrarModalInatividade(false);\n      resetarTelaCpf();\n    }\n  }, [mostrarModalInatividade, segundosRestantesInatividade]);`,
    "effects timer"
  );
}

mustReplace(
  /const resetarTelaCpf = \(\) => \{[\s\S]*?limparEstadoTelaPersistido\(\);\n  \};/,
  `const resetarTelaCpf = () => {\n    limparTemporizadoresInatividade();\n    setMostrarModalInatividade(false);\n    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);\n    setSegundosParaExpirarSessao(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));\n    setCpf("");\n    setPacienteNome("");\n    setConsultas([]);\n    setConsultaProcessandoSenhaId(null);\n    setConsultaAutorizacaoAberta(null);\n    setIniciarAutorizacaoAutomaticamente(false);\n    setAbrirTokenInlineAposEnvio(false);\n    setConsultaSelecionadaId(null);\n    setIndiceConsultaAtual(0);\n    setConsultaTokenAbertaId(null);\n    setConsultaReenviandoTokenId(null);\n    setConsultaValidandoTokenId(null);\n    setConsultaTecladoTokenId(null);\n    setTokenDigitadoPorConsulta({});\n    setTokenErroPorConsulta({});\n    setTokenFeedbackPorConsulta({});\n    setSenhasPainelDigitadas({});\n    setMostrarTecladoCpf(false);\n    setEtapaTela("cpf");\n    limparEstadoTelaPersistido();\n    window.setTimeout(() => {\n      reiniciarTemporizadorInatividade();\n    }, 0);\n  };`,
  "reset timer"
);

if (!s.includes("SESSÃO EXPIRA EM")) {
  mustReplace(
    /<div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-\[minmax\(0,1fr\)_210px\] md:items-center">[\s\S]*?<div className="flex min-h-0 h-full flex-col gap-3">/,
    `<div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[minmax(0,1fr)_230px_210px] md:items-center">\n                    <div className="min-w-0 text-center md:text-left">\n                      <p className="text-[0.98rem] font-black uppercase tracking-[0.18em] text-blue-100/85 md:text-[1.08rem]">\n                        Atendimentos do dia\n                      </p>\n                      <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">\n                        {pacienteNome || "Beneficiário"}\n                      </h2>\n                      <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">\n                        {dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----" ? dataConsultasCabecalho : "Data do atendimento"}\n                      </p>\n                    </div>\n                    <div className="flex items-center justify-center">\n                      <div className="inline-flex min-h-[84px] min-w-[220px] flex-col items-center justify-center rounded-[1.25rem] border border-white/20 bg-white/10 px-5 py-3 text-center text-white shadow-[0_14px_24px_rgba(15,23,42,0.14)]">\n                        <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-blue-100/85 md:text-[0.78rem]">\n                          SESSÃO EXPIRA EM\n                        </p>\n                        <p className="mt-2 text-[1.6rem] font-black tracking-[0.05em] text-white md:text-[1.9rem]">\n                          {formatarTempoSessao(segundosParaExpirarSessao)}\n                        </p>\n                      </div>\n                    </div>\n                    <div className="flex min-h-0 h-full flex-col gap-3">`,
    "header badge"
  );
}

if (!s.includes("VOCÊ AINDA ESTÁ AÍ?")) {
  mustReplace(
    /\{consultaAutorizacaoAberta && \([\s\S]*?\)\}/,
    (m) => `${m}\n\n        {mostrarModalInatividade && (\n          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4">\n            <div className="w-full max-w-2xl rounded-[1.6rem] border border-white/70 bg-white p-6 text-center shadow-[0_24px_48px_rgba(15,23,42,0.28)] md:p-8">\n              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-[2.4rem] font-black text-amber-600 md:h-28 md:w-28 md:text-[2.8rem]">\n                !\n              </div>\n              <h3 className="mt-5 text-[1.6rem] font-black uppercase tracking-[0.03em] text-slate-900 md:text-[2rem]">\n                VOCÊ AINDA ESTÁ AÍ?\n              </h3>\n              <p className="mt-3 text-[1rem] font-medium text-slate-600 md:text-[1.12rem]">\n                Sua sessão expira em instantes por falta de interação.\n              </p>\n              <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4">\n                <p className="text-[0.86rem] font-black uppercase tracking-[0.12em] text-amber-700 md:text-[0.94rem]">\n                  SUA SESSÃO EXPIRA EM\n                </p>\n                <p className="mt-2 text-[2.5rem] font-black tracking-tight text-amber-600 md:text-[3rem]">\n                  {formatarTempoSessao(segundosRestantesInatividade)}\n                </p>\n              </div>\n              <div className="mt-6 grid gap-3 md:grid-cols-2">\n                <button\n                  type="button"\n                  onClick={() => reiniciarTemporizadorInatividade()}\n                  className="h-14 rounded-[1rem] bg-emerald-600 px-5 text-[1rem] font-black uppercase text-white shadow-[0_14px_26px_rgba(5,150,105,0.22)] transition hover:bg-emerald-500"\n                >\n                  CONTINUAR\n                </button>\n                <button\n                  type="button"\n                  onClick={() => resetarTelaCpf()}\n                  className="h-14 rounded-[1rem] border border-red-200 bg-red-50 px-5 text-[1rem] font-black uppercase text-red-700 transition hover:bg-red-100"\n                >\n                  ENCERRAR AGORA\n                </button>\n              </div>\n            </div>\n          </div>\n        )}`,
    "modal timer"
  );
}

fs.writeFileSync(path, s, "utf8");
