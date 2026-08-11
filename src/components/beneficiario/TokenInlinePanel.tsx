import type { ClipboardEvent, KeyboardEvent } from "react";

interface ConsultaTokenInlineProps {
  idEvento: number;
}

interface TokenInlinePanelProps {
  consulta: ConsultaTokenInlineProps;
  tokenDigitado: string;
  tecladoTokenAberto: boolean;
  reenviandoToken: boolean;
  validandoToken: boolean;
  reenvioDesabilitadoPorErro: boolean;
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
  reenvioDesabilitadoPorErro,
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
    <div className="mt-0.5 rounded-[1rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-3 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.06)] sm:px-4 md:px-4 md:py-2">
      <div className="mx-auto grid w-full max-w-5xl gap-3 lg:grid-cols-[minmax(0,1.35fr)_18rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-center text-[0.82rem] font-black uppercase leading-[1.3] tracking-[0.02em] text-slate-900 md:text-[0.94rem]">
            Digite os 4 dígitos do seu token enviado para o aplicativo ou SMS.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
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
                className="h-[2.9rem] w-[2.9rem] rounded-[0.9rem] border border-slate-300 bg-white text-center text-[1.95rem] font-black text-slate-900 shadow-[0_6px_14px_rgba(15,23,42,0.05)] outline-none transition focus:border-cyan-400 focus:bg-sky-50 md:h-[3.45rem] md:w-[3.45rem] md:text-[2.2rem]"
              />
            ))}
          </div>

          <div className="rounded-[0.75rem] border border-sky-100 bg-sky-50/70 px-3 py-1 text-center text-[0.7rem] text-sky-800">
            Não recebeu? Toque em reenviar token.
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={onReenviar}
              disabled={
                reenviandoToken ||
                validandoToken ||
                reenvioBloqueado ||
                reenvioDesabilitadoPorErro
              }
              className="h-[2.35rem] rounded-[0.75rem] border border-orange-500 bg-orange-500 px-4 text-[0.76rem] font-black uppercase tracking-[0.03em] text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reenviandoToken ? "REENVIANDO..." : "REENVIAR TOKEN"}
            </button>
          </div>
        </div>

        {tecladoTokenAberto ? (
          <div className="mx-auto w-full max-w-[18rem] self-start rounded-[1rem] border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.14)] lg:-mt-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.1em] text-slate-600">
                Teclado numérico
              </p>
              <button
                type="button"
                onClick={onFecharTeclado}
                className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-slate-400 transition hover:text-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
                <button
                  key={consulta.idEvento + "-teclado-" + digito}
                  type="button"
                  onClick={() => onPreencherDigito(digito)}
                  className="h-[3.15rem] rounded-[0.95rem] bg-slate-900 text-[1.5rem] font-black text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
                >
                  {digito}
                </button>
              ))}
              <button
                type="button"
                onClick={onLimparToken}
                className="h-[3.15rem] rounded-[0.95rem] bg-red-500 text-[0.84rem] font-black uppercase text-white shadow-[0_8px_16px_rgba(239,68,68,0.18)] transition hover:bg-red-600"
              >
                Apagar
              </button>
              <button
                type="button"
                onClick={() => onPreencherDigito("0")}
                className="h-[3.15rem] rounded-[0.95rem] bg-slate-900 text-[1.5rem] font-black text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
              >
                0
              </button>
              <button
                type="button"
                onClick={onValidar}
                disabled={validandoToken || reenviandoToken || !tokenCompleto}
                className="h-[3.15rem] rounded-[0.95rem] bg-emerald-500 text-[1.55rem] font-black text-white shadow-[0_8px_16px_rgba(16,185,129,0.18)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={validandoToken ? "Validando token" : "Confirmar token"}
                title={validandoToken ? "Validando token" : "Confirmar token"}
              >
                {validandoToken ? "..." : "\u2713"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
