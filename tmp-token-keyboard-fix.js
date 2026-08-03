const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  "  const [consultaValidandoTokenId, setConsultaValidandoTokenId] = useState<number | null>(null);\n",
  "  const [consultaValidandoTokenId, setConsultaValidandoTokenId] = useState<number | null>(null);\n  const [consultaTecladoTokenId, setConsultaTecladoTokenId] = useState<number | null>(null);\n",
);

s = s.replace(
  /const focarCampoTokenInline = \(idEvento: number, indice: number\) => \{[\s\S]*?  \};\n/,
  `const focarCampoTokenInline = (idEvento: number, indice: number) => {
    if (typeof document === "undefined") return;
    const target = document.getElementById(
      \`token-inline-\${idEvento}-\${indice}\`,
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
`,
);

s = s.replace(
  /  \} finally \{\n    setConsultaValidandoTokenId\(null\);\n  \}\n\};\n\nconst abrirEtapaSenha = async \(consulta: ConsultaAutoAtendimento\) => \{/,
  `  } finally {
    setConsultaValidandoTokenId(null);
  }
};

const preencherTokenViaTecladoInline = (
  consulta: ConsultaAutoAtendimento,
  digito: string,
) => {
  const idEvento = consulta.idEvento;
  const numero = String(digito).replace(/\\D/g, "").slice(-1);

  if (!numero) {
    return;
  }

  let proximoToken = "";

  setTokenDigitadoPorConsulta((prev) => {
    const tokenAtual = String(prev[idEvento] || "").replace(/\\D/g, "").slice(0, 4);
    if (tokenAtual.length >= 4) {
      proximoToken = tokenAtual;
      return prev;
    }

    proximoToken = \`${'${'}tokenAtual}${'${'}numero}\`.slice(0, 4);
    return {
      ...prev,
      [idEvento]: proximoToken,
    };
  });

  limparMensagemTokenInline(idEvento);

  setTimeout(() => {
    focarCampoTokenInline(idEvento, proximoToken.length >= 4 ? 3 : proximoToken.length);

    if (proximoToken.length === 4) {
      void validarTokenInline(consulta);
    }
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

const abrirEtapaSenha = async (consulta: ConsultaAutoAtendimento) => {`,
);

s = s.replace(
  "    setConsultaTokenAbertaId(null);\n    await buscarConsultas();",
  "    setConsultaTokenAbertaId(null);\n    setConsultaTecladoTokenId(null);\n    await buscarConsultas();",
);

s = s.replace(
  "                              const validandoToken = consultaValidandoTokenId === consulta.idEvento;\n",
  "                              const validandoToken = consultaValidandoTokenId === consulta.idEvento;\n                              const tecladoTokenAberto = consultaTecladoTokenId === consulta.idEvento;\n",
);

s = s.replace(
  "                                  className={`flex min-h-0 flex-1 flex-col border ${tokenInlineVisivel ? \"p-2.5\" : \"p-3\"} shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition ${",
  "                                  className={`relative flex min-h-0 flex-1 flex-col border ${tokenInlineVisivel ? \"p-2.5\" : \"p-3\"} shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition ${",
);

s = s.replace(
  "                                              {\"Digite o seu token de 4 d\\u00edgitos, que chegou no seu celular, pelo aplicativo ou por SMS, para liberar o atendimento.\"}",
  "                                              {\"Digite os 4 dígitos do token.\"}",
);

s = s.replace(
  "                                                onPaste={(event) =>\n                                                  handleTokenInlinePaste(consulta.idEvento, event)\n                                                }\n                                                className=\"h-12 w-11 rounded-[0.9rem] border border-slate-300 bg-white text-center text-[1.15rem] font-black text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-cyan-400 focus:bg-sky-50 md:h-[3.4rem] md:w-[3.1rem] md:text-[1.3rem]\"",
  "                                                onPaste={(event) =>\n                                                  handleTokenInlinePaste(consulta.idEvento, event)\n                                                }\n                                                onFocus={() => abrirTecladoTokenInline(consulta.idEvento, indiceToken)}\n                                                onClick={() => abrirTecladoTokenInline(consulta.idEvento, indiceToken)}\n                                                readOnly\n                                                className=\"h-12 w-11 rounded-[0.9rem] border border-slate-300 bg-white text-center text-[1.15rem] font-black text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-cyan-400 focus:bg-sky-50 md:h-[3.4rem] md:w-[3.1rem] md:text-[1.3rem]\"",
);

s = s.replace("ATENÃ‡ÃƒO", "ATENÇÃO");
s = s.replace("Atendimento indisponÃƒÆ’Ã‚Â­vel", "Atendimento indisponível");

s = s.replace(
  "                                          </div>\n\n                                          {tokenErro ? (",
  `                                          </div>

                                          {tecladoTokenAberto ? (
                                            <div className="pointer-events-none absolute right-3 top-[4.8rem] z-20 w-[17rem] sm:w-[18rem] md:right-4 md:top-[4.5rem] md:w-[19rem]">
                                              <div className="pointer-events-auto rounded-[1rem] border border-slate-200 bg-white/98 p-3 shadow-[0_18px_38px_rgba(15,23,42,0.18)] backdrop-blur">
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                  <p className="text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-600">
                                                    TECLADO NUMÉRICO
                                                  </p>
                                                  <button
                                                    type="button"
                                                    onClick={fecharTecladoTokenInline}
                                                    className="text-[0.72rem] font-black uppercase tracking-[0.08em] text-slate-400 transition hover:text-slate-700"
                                                  >
                                                    FECHAR
                                                  </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
                                                    <button
                                                      key={\`${'${'}consulta.idEvento}-teclado-${'${'}digito}\`}
                                                      type="button"
                                                      onClick={() => preencherTokenViaTecladoInline(consulta, digito)}
                                                      className="h-12 rounded-[0.85rem] bg-slate-900 text-[1.2rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                                                    >
                                                      {digito}
                                                    </button>
                                                  ))}
                                                  <button
                                                    type="button"
                                                    onClick={() => limparTokenViaTecladoInline(consulta.idEvento)}
                                                    className="h-12 rounded-[0.85rem] bg-red-500 text-[0.82rem] font-black uppercase text-white shadow-[0_10px_20px_rgba(239,68,68,0.22)] transition hover:bg-red-600"
                                                  >
                                                    LIMPAR
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => preencherTokenViaTecladoInline(consulta, "0")}
                                                    className="h-12 rounded-[0.85rem] bg-slate-900 text-[1.2rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                                                  >
                                                    0
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => apagarUltimoDigitoViaTecladoInline(consulta.idEvento)}
                                                    className="h-12 rounded-[0.85rem] bg-amber-500 text-[0.78rem] font-black uppercase text-white shadow-[0_10px_20px_rgba(245,158,11,0.24)] transition hover:bg-amber-600"
                                                  >
                                                    APAGAR
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ) : null}

                                          {tokenErro ? (`,
);

fs.writeFileSync(path, s, "utf8");
