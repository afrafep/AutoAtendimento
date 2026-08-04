import type { ClipboardEvent, KeyboardEvent } from "react";

interface TokenFeedbackInlineProps {
  tipo: "success" | "error" | "info";
  mensagem: string;
}

interface ConsultaTokenInlineProps {
  idEvento: number;
  profissionalNome: string;
  especialidadeNome: string;
}

interface TokenInlinePanelProps {
  consulta: ConsultaTokenInlineProps;
  tokenDigitado: string;
  tokenErro: string;
  tokenFeedback?: TokenFeedbackInlineProps;
  tecladoTokenAberto: boolean;
  reenviandoToken: boolean;
  validandoToken: boolean;
  segundosRestantesReenvio: number;
  onTokenChange: (indice: number, valor: string) => void;
  onTokenKeyDown: (indice: number, event: KeyboardEvent<HTMLInputElement>) => void;
  onTokenPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onAbrirTeclado: (indice: number) => void;
  onFecharTeclado: () => void;
  onPreencherDigito: (digito: string) => void;
  onLimparToken: () => void;
  onApagarUltimoDigito: () => void;
  onReenviar: () => void;
  onValidar: () => void;
}

function formatarTempoCurto(segundos: number) {
  const total = Math.max(0, segundos);
  const minutos = String(Math.floor(total / 60)).padStart(2, "0");
  const segundosRestantes = String(total % 60).padStart(2, "0");
  return `${minutos}:${segundosRestantes}`;
}

export default function TokenInlinePanel({
  consulta,
  tokenDigitado,
  tokenErro,
  tokenFeedback,
  tecladoTokenAberto,
  reenviandoToken,
  validandoToken,
  segundosRestantesReenvio,
  onTokenChange,
  onTokenKeyDown,
  onTokenPaste,
  onAbrirTeclado,
  onFecharTeclado,
  onPreencherDigito,
  onLimparToken,
  onApagarUltimoDigito,
  onReenviar,
  onValidar,
}: TokenInlinePanelProps) {
  const reenvioBloqueado = segundosRestantesReenvio > 0;

  return (
    <div className="mt-2 rounded-[1.05rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:px-4 md:px-4 md:py-3">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 text-center">
        <div>
          <p className="text-[0.98rem] font-black uppercase tracking-[0.04em] text-slate-900 md:text-[1.05rem]">
            {"Digite os 4 d\u00edgitos do token."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {Array.from({ length: 4 }).map((_, indiceToken) => (
            <input
              key={`token-${consulta.idEvento}-${indiceToken}`}
              id={`token-inline-${consulta.idEvento}-${indiceToken}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={tokenDigitado[indiceToken] || ""}
              onChange={(event) => onTokenChange(indiceToken, event.target.value)}
              onKeyDown={(event) => onTokenKeyDown(indiceToken, event)}
              onPaste={onTokenPaste}
              onFocus={() => onAbrirTeclado(indiceToken)}
              onClick={() => onAbrirTeclado(indiceToken)}
              readOnly
              className="h-16 w-14 rounded-[1rem] border border-slate-300 bg-white text-center text-[1.6rem] font-black text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-cyan-400 focus:bg-sky-50 md:h-[4.5rem] md:w-[4rem] md:text-[1.9rem]"
            />
          ))}
        </div>

        {tecladoTokenAberto ? (
          <div className="pointer-events-none absolute right-3 top-[4.8rem] z-20 w-[17rem] sm:w-[18rem] md:right-4 md:top-[4.5rem] md:w-[19rem]">
            <div className="pointer-events-auto rounded-[1rem] border border-slate-200 bg-white/98 p-3 shadow-[0_18px_38px_rgba(15,23,42,0.18)] backdrop-blur">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-600">
                  {"TECLADO NUM\u00c9RICO"}
                </p>
                <button
                  type="button"
                  onClick={onFecharTeclado}
                  className="text-[0.72rem] font-black uppercase tracking-[0.08em] text-slate-400 transition hover:text-slate-700"
                >
                  FECHAR
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
                  <button
                    key={consulta.idEvento + "-teclado-" + digito}
                    type="button"
                    onClick={() => onPreencherDigito(digito)}
                    className="h-12 rounded-[0.85rem] bg-slate-900 text-[1.2rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                  >
                    {digito}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onLimparToken}
                  className="h-12 rounded-[0.85rem] bg-red-500 text-[0.82rem] font-black uppercase text-white shadow-[0_10px_20px_rgba(239,68,68,0.22)] transition hover:bg-red-600"
                >
                  LIMPAR
                </button>
                <button
                  type="button"
                  onClick={() => onPreencherDigito("0")}
                  className="h-12 rounded-[0.85rem] bg-slate-900 text-[1.2rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={onApagarUltimoDigito}
                  className="h-12 rounded-[0.85rem] bg-amber-500 text-[0.78rem] font-black uppercase text-white shadow-[0_10px_20px_rgba(245,158,11,0.24)] transition hover:bg-amber-600"
                >
                  APAGAR
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tokenErro ? (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-center shadow-sm">
            <p className="text-[0.9rem] font-black uppercase tracking-[0.04em] text-red-700 md:text-[1rem]">
              {"ATEN\u00c7\u00c3O"}
            </p>
            <p className="mt-1 text-[0.82rem] font-bold text-red-700 md:text-[0.92rem]">
              {tokenErro}
            </p>
          </div>
        ) : tokenFeedback ? (
          <div
            className={`rounded-[1rem] border px-4 py-3 text-center shadow-sm ${
              tokenFeedback.tipo === "success"
                ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                : tokenFeedback.tipo === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            {tokenFeedback.tipo === "success" ? (
              <div className="space-y-1">
                <p className="text-[0.95rem] font-black uppercase tracking-[0.04em] md:text-[1.05rem]">
                  TOKEN REENVIADO
                </p>
                <p className="text-[0.82rem] font-bold md:text-[0.92rem]">
                  {tokenFeedback.mensagem}
                </p>
              </div>
            ) : (
              tokenFeedback.mensagem
            )}
          </div>
        ) : (
          <div className="rounded-[0.85rem] border border-sky-100 bg-sky-50/70 px-3 py-1.5 text-[0.74rem] text-sky-800">
            {"N\u00e3o recebeu? Toque em reenviar token."}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onReenviar}
            disabled={reenviandoToken || validandoToken || reenvioBloqueado}
            className="h-10 rounded-[0.85rem] border border-orange-600 bg-orange-500 px-4 text-[0.72rem] font-black uppercase tracking-[0.03em] text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-11"
          >
            {reenviandoToken
              ? "REENVIANDO..."
              : reenvioBloqueado
                ? `REENVIAR TOKEN (${formatarTempoCurto(segundosRestantesReenvio)})`
                : "REENVIAR TOKEN"}
          </button>
          <button
            type="button"
            onClick={onValidar}
            disabled={validandoToken || reenviandoToken}
            className="h-10 rounded-[0.85rem] bg-emerald-600 px-4 text-[0.72rem] font-black uppercase tracking-[0.03em] text-white shadow-[0_10px_18px_rgba(5,150,105,0.22)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 md:h-11"
          >
            {validandoToken ? "VALIDANDO..." : "CONFIRMAR TOKEN"}
          </button>
        </div>
      </div>
    </div>
  );
}
