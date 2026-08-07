import type { ClipboardEvent, KeyboardEvent } from "react";

interface ConsultaTokenInlineProps {
  idEvento: number;
  profissionalNome: string;
  especialidadeNome: string;
}

interface TokenInlinePanelProps {
  consulta: ConsultaTokenInlineProps;
  tokenDigitado: string;
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
  onReenviar: () => void;
  onValidar: () => void;
}


export default function TokenInlinePanel({
  consulta,
  tokenDigitado,
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
  onReenviar,
  onValidar,
}: TokenInlinePanelProps) {
  const reenvioBloqueado = segundosRestantesReenvio > 0;
  const tokenCompleto = tokenDigitado.length === 4;

  return (
    <div className="mt-1 rounded-[1.05rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:px-4 md:px-4 md:py-2.5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5 text-center">
        <div>
          <p className="text-[1.08rem] font-black uppercase tracking-[0.04em] text-slate-900 md:text-[1.2rem]">
            {"Digite os 4 d\u00edgitos do seu token enviado para o Aplicativo ou sms."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3.5 md:gap-4">
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
              className="h-[2rem] w-[2rem] rounded-[1rem] border border-slate-300 bg-white text-center text-[1.9rem] font-black text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-cyan-400 focus:bg-sky-50 md:h-[3.9rem] md:w-[3.8rem] md:text-[2.6rem]"
            />
          ))}
        </div>

        {tecladoTokenAberto ? (
          <div className="pointer-events-none absolute right-2 top-[4.2rem] z-20 w-[19.5rem] sm:w-[20rem] md:right-3 md:top-[4rem] md:w-[20.5rem]">
            <div className="pointer-events-auto rounded-[1rem] border border-slate-200 bg-white/98 p-3.5 shadow-[0_18px_38px_rgba(15,23,42,0.18)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[0.8rem] font-black uppercase tracking-[0.12em] text-slate-600">
                  {"TECLADO NUM\u00c9RICO"}
                </p>
                <button
                  type="button"
                  onClick={onFecharTeclado}
                  className="text-[0.8rem] font-black uppercase tracking-[0.08em] text-slate-400 transition hover:text-slate-700"
                >
                  FECHAR
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
                  <button
                    key={consulta.idEvento + "-teclado-" + digito}
                    type="button"
                    onClick={() => onPreencherDigito(digito)}
                    className="h-[3.55rem] rounded-[0.95rem] bg-slate-900 text-[1.55rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                  >
                    {digito}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onLimparToken}
                  className="h-[3.55rem] rounded-[0.95rem] bg-red-500 text-[0.92rem] font-black uppercase text-white shadow-[0_10px_20px_rgba(239,68,68,0.22)] transition hover:bg-red-600"
                >
                  APAGAR
                </button>
                <button
                  type="button"
                  onClick={() => onPreencherDigito("0")}
                  className="h-[3.55rem] rounded-[0.95rem] bg-slate-900 text-[1.55rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                >
                  0
                </button>              
              </div>
            </div>
          </div>
        ) : null}
        <div className="rounded-[0.85rem] border border-sky-100 bg-sky-50/70 px-3 py-2 text-[0.84rem] text-sky-800">
          {"N\u00e3o recebeu? Toque em reenviar token."}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={onReenviar}
            disabled={reenviandoToken || validandoToken || reenvioBloqueado}
            className="h-10 rounded-[0.70rem] border border-orange-600 bg-orange-500 px-4 text-[0.84rem] font-black uppercase tracking-[0.03em] text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-[3.0rem]"
          >
            {reenviandoToken
              ? "REENVIANDO..."
              : reenvioBloqueado
                ? `REENVIAR TOKEN`
                : "REENVIAR TOKEN"}
          </button>
          <button
            type="button"
            onClick={onValidar}
            disabled={validandoToken || reenviandoToken || !tokenCompleto}
            className="h-12 rounded-[0.95rem] bg-emerald-600 px-4 text-[0.84rem] font-black uppercase tracking-[0.03em] text-white shadow-[0_10px_18px_rgba(5,150,105,0.22)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 md:h-[3.0rem]"
          >
            {validandoToken ? "VALIDANDO..." : "CONFIRMAR TOKEN"}
          </button>
        </div>
      </div>
    </div>
  );
}







