interface BuildTokenValidarDialogHtmlParams {
  nome: string;
  nrCarteiraPlano: string;
  numeroGuiaExibicao: string;
  tokenEnviado: boolean;
}

export const TOKEN_VALIDAR_SWAL_CLASSES = {
  popup:
    "!w-[min(99vw,78rem)] !rounded-[1.5rem] !border !border-slate-200 !bg-white !px-8 !pb-6 !pt-5 !shadow-[0_28px_60px_rgba(15,23,42,0.22)]",
  title:
    "!mb-3 !text-[1.2rem] !font-black !tracking-tight !text-slate-900 sm:!text-[1.5rem]",
  htmlContainer: "!mx-0 !mt-0 !px-0 !pb-0 !text-left",
  actions: "!grid !grid-cols-3 !gap-3 !w-full !mt-4 !pt-0",
  confirmButton:
    "!order-3 !m-0 !flex !h-11 !w-full !items-center !justify-center !rounded-[0.95rem] !border !border-emerald-500 !bg-emerald-600 !px-2 !text-[0.72rem] !font-black !text-white !transition hover:!bg-emerald-500 sm:!h-12 sm:!text-[0.8rem]",
  denyButton:
    "!order-2 !m-0 !flex !h-11 !w-full !items-center !justify-center !rounded-[0.95rem] !border !border-amber-300 !bg-amber-50 !px-2 !text-[0.64rem] !font-black !text-amber-900 !transition hover:!bg-amber-100 sm:!h-12 sm:!text-[0.72rem]",
  cancelButton:
    "!order-1 !m-0 !flex !h-11 !w-full !items-center !justify-center !rounded-[0.95rem] !border !border-slate-200 !bg-white !px-2 !text-[0.72rem] !font-black !text-slate-800 !transition hover:!bg-slate-50 sm:!h-12 sm:!text-[0.8rem]",
} as const;

export const buildTokenValidarDialogHtml = ({
  nome,
  nrCarteiraPlano,
  numeroGuiaExibicao,
  tokenEnviado,
}: BuildTokenValidarDialogHtmlParams) => `
  <div class="space-y-3.5 sm:space-y-4">
    <div class="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div class="text-center">
        <p class="text-[1.08rem] font-bold leading-6 text-slate-900 sm:text-[1.26rem]">Digite o token de 4 dígitos recebido no celular.</p>
        <p class="mt-1 text-[0.92rem] leading-5 text-slate-600 sm:text-[1rem]">Token enviado para o aplicativo ou SMS.</p>
      </div>

      <div class="mt-3 flex justify-center gap-1.5 sm:gap-2">
        ${Array.from({ length: 4 })
          .map(
            (_, i) => `
          <input
            type="text"
            maxlength="1"
            class="token-input h-12 w-12 rounded-[0.95rem] border border-slate-300 bg-white text-center text-[1.18rem] font-black tracking-[0.04em] text-slate-900 transition-all duration-200 focus:border-cyan-400 focus:bg-sky-50 focus:ring-2 focus:ring-cyan-500/15 sm:h-14 sm:w-14 sm:text-[1.35rem]"
            data-index="${i}"
            inputmode="numeric"
            pattern="[0-9]*"
          />
        `,
          )
          .join("")}
      </div>
    </div>
    <input type="hidden" id="full-token" />

    <div class="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-slate-500">Teclado numérico</p>
        <p class="text-[0.7rem] text-slate-500">Toque para digitar</p>
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        ${["1", "2", "3", "4", "5", "6", "7", "8", "9"]
          .map(
            (digit) => `
          <button
            type="button"
            class="token-keypad-button flex h-14 items-center justify-center rounded-[1rem] border border-slate-300 bg-white text-[1.45rem] font-black text-slate-900 transition hover:border-cyan-400 hover:bg-sky-50 focus:outline-none sm:h-15 sm:text-[1.6rem]"
            data-digit="${digit}"
          >
            ${digit}
          </button>
        `,
          )
          .join("")}
        <button
          type="button"
          id="token-keypad-clear"
          class="flex h-14 items-center justify-center rounded-[1rem] border border-red-700 bg-[linear-gradient(180deg,#ef4444_0%,#dc2626_100%)] px-2 text-[0.95rem] font-black uppercase tracking-[0.05em] text-white transition hover:brightness-105 focus:outline-none sm:h-15 sm:text-[1.08rem]"
        >
          APAGAR
        </button>
        <button
          type="button"
          class="token-keypad-button flex h-14 items-center justify-center rounded-[1rem] border border-slate-300 bg-white text-[1.45rem] font-black text-slate-900 transition hover:border-cyan-400 hover:bg-sky-50 focus:outline-none sm:h-15 sm:text-[1.6rem]"
          data-digit="0"
        >
          0
        </button>
        <div class="hidden sm:block"></div>
      </div>
    </div>

    <div class="hidden rounded-[1rem] border border-slate-200 bg-white p-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.66rem] text-left text-slate-600 sm:text-[0.78rem]">
        <div>
          <p class="text-slate-400">Paciente</p>
          <p class="mt-0.5 font-semibold leading-4 text-slate-900">${nome}</p>
        </div>
        <div>
          <p class="text-slate-500">Carteira</p>
          <p class="mt-0.5 font-mono text-slate-900">${nrCarteiraPlano || "N/A"}</p>
        </div>
        <div>
          <p class="text-slate-500">Número da guia</p>
          <p class="mt-0.5 font-mono text-slate-900">${numeroGuiaExibicao || "N/A"}</p>
        </div>
        <div>
          <p class="text-slate-500">Status</p>
          <p class="mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-black ${
            tokenEnviado
              ? "bg-emerald-500/12 text-emerald-300"
              : "bg-amber-500/12 text-amber-300"
          }">${tokenEnviado ? "Enviado" : "Pendente"}</p>
        </div>
      </div>
    </div>

    <div class="rounded-[1rem] border border-sky-200 bg-sky-50 px-3.5 py-3">
      <p class="text-center text-[0.72rem] leading-5 text-sky-900 sm:text-[0.8rem]">
        Se não recebeu o código, toque em <span class="font-bold text-sky-950">Reenviar token</span>.
      </p>
    </div>

    <div id="token-resend-feedback" class="hidden rounded-[0.85rem] border px-3 py-2 text-center text-[0.66rem] leading-4 sm:text-[0.72rem]"></div>
  </div>
`;
