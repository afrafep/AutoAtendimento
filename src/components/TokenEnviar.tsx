import Swal from "sweetalert2";
import { api } from "../config/configApi";

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

interface TokenEnviarProps {
  nome: string;
  nrCarteiraPlano: string;
  senhaGuia: string;
  numeroGuiaGerado?: string;
  numeroGuiaOperadora?: number;
  isReenvio?: boolean;
  silencioso?: boolean;
  onSucesso?: () => void;
  onErro?: (erro: any) => void;
}

export const TokenEnviar = async ({
  nome,
  nrCarteiraPlano,
  senhaGuia,
  numeroGuiaOperadora = 0,
  isReenvio = false,
  silencioso = false,
  onSucesso,
  onErro,
}: TokenEnviarProps): Promise<boolean> => {
  let swalInstance: any = null;
  const numeroGuiaPayload = resolveNumeroGuiaOperadora(
    senhaGuia,
    numeroGuiaOperadora,
  );

  try {
    if (silencioso) {
      const payloadEnvio = {
        cdBeneficiario: toSafeString(nrCarteiraPlano),
        numeroGuiaOperadora: numeroGuiaPayload,
      };

      await api.post("/sisclinic/token/enviar", payloadEnvio);
      onSucesso?.();
      return true;
    }

    let processing = false;

    swalInstance = await Swal.fire({
      title: isReenvio ? "Reenviando Token" : "Enviando Token",
      html: `
        <div class="space-y-4">
          <div class="flex justify-center">
            <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span class="text-3xl">...</span>
            </div>
          </div>
          <p class="text-gray-300 text-center">${
            isReenvio
              ? "Reenviando token para o aplicativo..."
              : "Enviando token para o aplicativo..."
          }</p>
          <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-400">Paciente:</span>
              <span class="text-white">${nome.split(" ")[0]}</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="text-gray-400">Senha Guia:</span>
              <span class="text-white font-mono">${senhaGuia}</span>
            </div>
          </div>
          <div class="flex justify-center">
            <div id="loading-spinner" class="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      showCancelButton: false,
      background: "#1f2937",
      color: "#f9fafb",
      didOpen: () => {
        if (processing) return;
        processing = true;

        const executeEnvio = async () => {
          try {
            const payloadEnvio = {
              cdBeneficiario: toSafeString(nrCarteiraPlano),
              numeroGuiaOperadora: numeroGuiaPayload,
            };

            await api.post("/sisclinic/token/enviar", payloadEnvio);
            Swal.close();
            onSucesso?.();

          } catch (err: any) {
            Swal.close();

            const retornoApi = extrairRetornoApi(err?.response?.data);
            const errorMessage =
              retornoApi.mensagem ||
              (isReenvio
                ? "Não foi possível reenviar o token."
                : "Não foi possível enviar o token.");

            await Swal.fire({
              title: "Erro",
              html: `
                <div class="space-y-3 text-left">
                  <div class="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-red-200">Status API:</span>
                      <span class="text-white font-mono">${retornoApi.status || err?.response?.status || "N/A"}</span>
                    </div>
                    <div class="mt-2 text-sm text-red-100 break-words">
                      ${errorMessage}
                    </div>
                  </div>
                </div>
              `,
              icon: "error",
              confirmButtonText: "Fechar",
              background: "#1f2937",
              color: "#f9fafb",
            });

            onErro?.(err);
          }
        };

        executeEnvio();
      },
    });

    return true;
  } catch (error) {
    if (swalInstance) {
      Swal.close();
    }

    onErro?.(error);
    return false;
  }
};


