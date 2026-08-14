import Swal from "sweetalert2";
import { api } from "../config/configApi";
import {
  buildTokenValidarDialogHtml,
  TOKEN_VALIDAR_SWAL_CLASSES,
} from "./tokenValidarDialogHtml";

const toSafeString = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(
      obj.value ??
        obj.codigo ??
        obj.id ??
        obj.numero ??
        obj.sigla ??
        "",
    ).trim();
  }
  return String(value).trim();
};

const toSafeNumber = (value: unknown) => {
  const normalized = toSafeString(value);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
};

const resolveNumeroGuiaOperadora = (
  senhaGuia: unknown,
  numeroGuiaOperadora: unknown,
) => {
  const numeroDireto = toSafeNumber(numeroGuiaOperadora);
  if (numeroDireto > 0) return numeroDireto;

  const senhaComoNumero = toSafeNumber(senhaGuia);
  if (senhaComoNumero > 0) return senhaComoNumero;

  return 0;
};

const extrairRetornoApi = (data: any) => ({
  status: toSafeString(data?.status),
  mensagem: toSafeString(data?.mensagem || data?.message || data?.error),
});

const normalizarMensagemToken = (mensagem?: string) => {
  const texto = toSafeString(mensagem);
  const textoLower = texto.toLowerCase();

  if (
    textoLower.includes("token invalido") ||
    textoLower.includes("token inválido") ||
    textoLower.includes("ora-20400")
  ) {
    return "Token inválido";
  }

  return texto;
};

interface TokenValidarProps {
  nome: string;
  nrCarteiraPlano: string;
  senhaGuia: string;
  numeroGuiaGerado?: string;
  numeroGuiaOperadora?: number;
  tokenEnviado: boolean;
  onTokenValidado?: (token: string, tokenValidado: boolean) => void;
  onReenviarToken?: () => Promise<boolean | void> | boolean | void;
  onCancelar?: () => void;
}

interface TokenValidarResult {
  tokenDigitado?: string;
  dismiss?: any;
}

interface TokenValidationResult {
  token: string;
  tokenValidado: boolean;
  apiStatus?: string;
  apiMensagem?: string;
}

export const TokenValidar = async ({
  nome,
  nrCarteiraPlano,
  senhaGuia,
  numeroGuiaOperadora = 0,
  tokenEnviado,
  onTokenValidado,
  onReenviarToken,
  onCancelar,
}: TokenValidarProps): Promise<TokenValidarResult> => {
  const numeroGuiaPayload = resolveNumeroGuiaOperadora(
    senhaGuia,
    numeroGuiaOperadora,
  );
  const numeroGuiaExibicao =
    toSafeString(numeroGuiaPayload) || toSafeString(senhaGuia);

  const clearValidationMessage = () => {
    const validationContainer = Swal.getHtmlContainer()?.querySelector(
      ".swal2-validation-message",
    );
    if (validationContainer) {
      validationContainer.innerHTML = "";
      validationContainer.classList.remove("swal2-validation-message");
    }
  };

  const setInlineResendFeedback = (
    type: "info" | "success" | "error",
    message: string,
  ) => {
    const container = document.getElementById("token-resend-feedback");
    if (!container) return;

    const classMap = {
      info: "border-cyan-400/40 bg-cyan-500/10 text-cyan-100",
      success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
      error: "border-rose-400/40 bg-rose-500/10 text-rose-100",
    };

    container.className = `rounded-[0.85rem] border px-3 py-2 text-center text-[0.66rem] leading-4 sm:text-[0.72rem] ${classMap[type]}`;
    container.textContent = message;
    container.classList.remove("hidden");
  };

  const hideInlineResendFeedback = () => {
    const container = document.getElementById("token-resend-feedback");
    if (!container) return;

    container.textContent = "";
    container.className =
      "hidden rounded-[0.85rem] border px-3 py-2 text-center text-[0.66rem] leading-4 sm:text-[0.72rem]";
  };

  const setReenviarTokenState = (processing: boolean) => {
    const denyButton = Swal.getDenyButton();
    const confirmButton = Swal.getConfirmButton();
    const cancelButton = Swal.getCancelButton();

    if (denyButton) {
      denyButton.disabled = processing;
      denyButton.innerHTML = processing ? "Reenviando..." : "📲 Reenviar token";
    }

    if (confirmButton) confirmButton.disabled = processing;
    if (cancelButton) cancelButton.disabled = processing;
  };

  const setupTokenInputs = () => {
    const inputs =
      Swal.getHtmlContainer()?.querySelectorAll<HTMLInputElement>(".token-input");
    const hiddenInput = document.getElementById("full-token") as HTMLInputElement;
    const keypadButtons =
      Swal.getHtmlContainer()?.querySelectorAll<HTMLButtonElement>(".token-keypad-button");
    const clearButton = document.getElementById("token-keypad-clear") as HTMLButtonElement | null;
    // backspaceButton removido - não será mais usado

    if (!inputs || !hiddenInput) return;

    inputs.forEach((input) => {
      input.replaceWith(input.cloneNode(true));
    });

    keypadButtons?.forEach((button) => {
      button.replaceWith(button.cloneNode(true));
    });

    clearButton?.replaceWith(clearButton.cloneNode(true));
    // backspaceButton removido

    const freshInputs =
      Swal.getHtmlContainer()?.querySelectorAll<HTMLInputElement>(".token-input");
    const freshHiddenInput = document.getElementById(
      "full-token",
    ) as HTMLInputElement;
    const freshKeypadButtons =
      Swal.getHtmlContainer()?.querySelectorAll<HTMLButtonElement>(".token-keypad-button");
    const freshClearButton = document.getElementById("token-keypad-clear") as HTMLButtonElement | null;
    // freshBackspaceButton removido

    if (!freshInputs || !freshHiddenInput) return;

    const syncHiddenToken = () => {
      freshHiddenInput.value = Array.from(freshInputs)
        .map((inp) => inp.value)
        .join("");
    };

    const getActiveIndex = () => {
      const focusedIndex = Array.from(freshInputs).findIndex(
        (input) => input === document.activeElement,
      );

      if (focusedIndex >= 0) return focusedIndex;

      const firstEmptyIndex = Array.from(freshInputs).findIndex((input) => !input.value);
      return firstEmptyIndex >= 0 ? firstEmptyIndex : freshInputs.length - 1;
    };

    const fillTokenDigit = (digit: string) => {
      if (!/^\d$/.test(digit)) return;

      clearValidationMessage();

      const activeIndex = getActiveIndex();
      const targetInput = freshInputs[activeIndex];
      targetInput.value = digit;

      if (activeIndex < freshInputs.length - 1) {
        freshInputs[activeIndex + 1].focus();
      } else {
        targetInput.focus();
      }

      syncHiddenToken();
    };

    const removeLastDigit = () => {
      clearValidationMessage();

      const activeIndex = getActiveIndex();
      const currentInput = freshInputs[activeIndex];

      if (currentInput.value) {
        currentInput.value = "";
        currentInput.focus();
      } else if (activeIndex > 0) {
        freshInputs[activeIndex - 1].value = "";
        freshInputs[activeIndex - 1].focus();
      }

      syncHiddenToken();
    };

    freshInputs.forEach((input, idx) => {
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value.replace(/\D/g, "").slice(-1);

        clearValidationMessage();
        target.value = value;

        if (value && idx < freshInputs.length - 1) {
          freshInputs[idx + 1].focus();
        }

        syncHiddenToken();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          removeLastDigit();
          return;
        }

        if (e.key === "ArrowLeft" && idx > 0) {
          e.preventDefault();
          freshInputs[idx - 1].focus();
          return;
        }

        if (e.key === "ArrowRight" && idx < freshInputs.length - 1) {
          e.preventDefault();
          freshInputs[idx + 1].focus();
          return;
        }

        if (e.key === "Tab") {
          return;
        }

        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      });

      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData?.getData("text") || "";
        const numbers = pasteData.replace(/\D/g, "").slice(0, 4);

        clearValidationMessage();
        freshInputs.forEach((field) => {
          field.value = "";
        });

        numbers.split("").forEach((char, charIndex) => {
          if (freshInputs[charIndex]) {
            freshInputs[charIndex].value = char;
          }
        });

        syncHiddenToken();
        const lastFilledIndex = Math.min(Math.max(numbers.length - 1, 0), freshInputs.length - 1);
        freshInputs[lastFilledIndex]?.focus();
      });

      input.addEventListener("click", clearValidationMessage);
      input.addEventListener("focus", clearValidationMessage);
    });

    freshKeypadButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        fillTokenDigit(button.dataset.digit || "");
      });
    });

    // Apenas o botão APAGAR (remove o último dígito)
    freshClearButton?.addEventListener("click", removeLastDigit);

    freshInputs[0]?.focus();
  };

  const result = await Swal.fire({
    title: "TOKEN ENVIADO PARA O APLICATIVO OU SMS",
    html: buildTokenValidarDialogHtml({
      nome,
      nrCarteiraPlano,
      numeroGuiaExibicao,
      tokenEnviado,
    }),
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "CONFIRMAR",
    cancelButtonText: "VOLTAR",
    denyButtonText: "REENVIAR TOKEN",
    background: "#ffffff",
    color: "#0f172a",
    allowOutsideClick: false,
    buttonsStyling: false,
    customClass: TOKEN_VALIDAR_SWAL_CLASSES,
    preDeny: async () => {
      hideInlineResendFeedback();
      clearValidationMessage();
      setReenviarTokenState(true);
      setInlineResendFeedback("info", "Reenviando token para o celular...");

      try {
        const reenvioOk = await onReenviarToken?.();

        if (reenvioOk === false) {
          setInlineResendFeedback(
            "error",
            "Não foi possível reenviar o token. Tente novamente em alguns instantes.",
          );
          return false;
        }

        setInlineResendFeedback(
          "success",
          "Novo token enviado. Digite o código recebido no celular.",
        );
        return false;
      } catch (_error) {
        setInlineResendFeedback(
          "error",
          "Não foi possível reenviar o token. Tente novamente em alguns instantes.",
        );
        return false;
      } finally {
        setReenviarTokenState(false);
      }
    },
    preConfirm: async (): Promise<TokenValidationResult | null> => {
      const token =
        (document.getElementById("full-token") as HTMLInputElement)?.value || "";

      if (token.length !== 4) {
        Swal.showValidationMessage("Digite todos os 4 dígitos do token");
        return null;
      }
      if (!/^\d+$/.test(token)) {
        Swal.showValidationMessage("O token deve conter apenas números");
        return null;
      }

      try {
        Swal.showLoading();

        const payloadValidacao = {
          token: toSafeString(token),
          cdBeneficiario: toSafeString(nrCarteiraPlano),
          numeroGuiaOperadora: numeroGuiaPayload,
        };

        console.log("📤 Enviando para validação:", payloadValidacao);

        const response = await api.post("/sisclinic/token/validar", payloadValidacao);

        Swal.hideLoading();

        console.log("📥 Resposta da API:", response.data);

        const retornoApi = extrairRetornoApi(response.data);
        const mensagem = normalizarMensagemToken(retornoApi.mensagem || "");
        const mensagemLower = mensagem.toLowerCase();

        if (mensagemLower.includes("token validado com sucesso")) {
          return {
            token,
            tokenValidado: true,
            apiStatus: retornoApi.status,
            apiMensagem: mensagem,
          };
        }

        if (mensagemLower.includes("senha já validada com envio de token")) {
          Swal.showValidationMessage(
            `✅ ${retornoApi.status ? `[${retornoApi.status}] ` : ""}${mensagem}`,
          );
          return {
            token,
            tokenValidado: true,
            apiStatus: retornoApi.status,
            apiMensagem: mensagem,
          };
        }

        Swal.showValidationMessage(
          mensagem === "Token inválido"
            ? mensagem
            : `${retornoApi.status ? `[${retornoApi.status}] ` : ""}${mensagem || "Token inválido"}`,
        );
        return null;
      } catch (error: any) {
        Swal.hideLoading();
        console.error("❌ Erro na validação:", error);

        let errorMessage = "Erro ao validar token";
        let errorStatus = "";

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          const retornoApi = extrairRetornoApi(data);
          errorStatus = retornoApi.status || String(status);

          console.log(`📥 Erro ${status}:`, data);

          if (typeof data === "string") {
            errorMessage = normalizarMensagemToken(data);
          } else if (retornoApi.mensagem) {
            errorMessage = normalizarMensagemToken(retornoApi.mensagem);
          } else if (status === 400) {
            errorMessage = "Requisição inválida - verifique os dados enviados";
          } else if (status === 401) {
            errorMessage = "Não autorizado";
          } else if (status === 404) {
            errorMessage = "Serviço não encontrado";
          } else if (status === 500) {
            errorMessage = "Erro interno do servidor";
          } else {
            errorMessage = `Erro ${status} - ${JSON.stringify(data)}`;
          }
        } else if (error.request) {
          errorMessage = "Sem resposta do servidor - verifique sua conexão";
          errorStatus = "SEM_RESPOSTA";
        } else {
          errorMessage = error.message || "Erro desconhecido";
        }

        Swal.showValidationMessage(
          errorMessage === "Token inválido"
            ? errorMessage
            : `${errorStatus ? `[${errorStatus}] ` : ""}${errorMessage}`,
        );
        return null;
      }
    },
    didOpen: () => {
      setTimeout(setupTokenInputs, 100);
    },
  });

  if (result.value) {
    const validationResult = result.value as TokenValidationResult;
    const { token, tokenValidado, apiStatus, apiMensagem } = validationResult;

    onTokenValidado?.(token, tokenValidado);

    await Swal.fire({
      title: "✅ Token Validado!",
      html: `
        <div class="space-y-3 text-left">
          <div class="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
            <div class="flex items-center justify-between text-sm">
              <span class="text-green-200">Status API:</span>
              <span class="text-white font-mono">${apiStatus || "N/A"}</span>
            </div>
            <div class="mt-2 text-sm text-green-100 break-words">
              ${apiMensagem || "Token validado com sucesso!"}
            </div>
          </div>
        </div>
      `,
      icon: "success",
      background: "#ffffff",
      color: "#0f172a",
      confirmButtonText: "CONFIRMAR",
    });
  } else if (result.dismiss === Swal.DismissReason.cancel) {
    onCancelar?.();
  }

  return {
    tokenDigitado: result.value
      ? (result.value as TokenValidationResult).token
      : undefined,
    dismiss: result.dismiss,
  };
};
