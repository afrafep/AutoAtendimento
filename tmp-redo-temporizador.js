const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");

function ensureReplace(search, replace) {
  if (!s.includes(search)) throw new Error("Trecho nao encontrado: " + search.slice(0, 80));
  s = s.replace(search, replace);
}

if (!s.includes("const TEMPO_INATIVIDADE_MS = 2 * 60 * 1000;")) {
  ensureReplace(
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
}

if (!s.includes("const [segundosParaExpirarSessao")) {
  ensureReplace(
`  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<number | null>(null);
  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);
  const [segundosRestantesInatividade, setSegundosRestantesInatividade] = useState(CONTAGEM_INATIVIDADE_SEGUNDOS);
  const timeoutInatividadeRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const intervaloInatividadeRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
`,
`  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<number | null>(null);
  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);
  const [segundosRestantesInatividade, setSegundosRestantesInatividade] = useState(CONTAGEM_INATIVIDADE_SEGUNDOS);
  const [segundosParaExpirarSessao, setSegundosParaExpirarSessao] = useState(Math.ceil(TEMPO_INATIVIDADE_MS / 1000));
  const timeoutInatividadeRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const intervaloInatividadeRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const intervaloSessaoRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
`
  );
}

ensureReplace(
`  const limparTemporizadoresInatividade = () => {
    if (timeoutInatividadeRef.current) {
      window.clearTimeout(timeoutInatividadeRef.current);
      timeoutInatividadeRef.current = null;
    }

    if (intervaloInatividadeRef.current) {
      window.clearInterval(intervaloInatividadeRef.current);
      intervaloInatividadeRef.current = null;
    }
  };

  const abrirModalInatividade = () => {
    limparTemporizadoresInatividade();
    setMostrarModalInatividade(true);
    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);
    intervaloInatividadeRef.current = window.setInterval(() => {
      setSegundosRestantesInatividade((valorAtual) => valorAtual - 1);
    }, 1000);
  };

  const reiniciarTemporizadorInatividade = () => {
    limparTemporizadoresInatividade();
    setMostrarModalInatividade(false);
    setSegundosRestantesInatividade(CONTAGEM_INATIVIDADE_SEGUNDOS);
    timeoutInatividadeRef.current = window.setTimeout(() => {
      abrirModalInatividade();
    }, TEMPO_INATIVIDADE_MS);
  };
`,
`  const limparTemporizadoresInatividade = () => {
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

ensureReplace(
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

ensureReplace(
`              <p className="mt-3 text-[1rem] font-medium text-slate-600 md:text-[1.12rem]">
                Sua sessão expira em instantes por falta de interação.
              </p>
              <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-[0.86rem] font-black uppercase tracking-[0.12em] text-amber-700 md:text-[0.94rem]">
                  SUA SESSÃO EXPIRA EM
                </p>
                <p className="mt-2 text-[2.5rem] font-black tracking-tight text-amber-600 md:text-[3rem]">
                  {segundosRestantesInatividade >= 60
                    ? \`${'${'}Math.ceil(segundosRestantesInatividade / 60)} min\`
                    : \`${'${'}segundosRestantesInatividade}s\`}
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

fs.writeFileSync(path, s, "utf8");
