"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

type AtualizacaoDisponivelBannerProps = {
  versaoInicial: string;
};

const INTERVALO_VERIFICACAO_MS = 40_000;
const TOAST_ID_ATUALIZACAO = "sis-nova-versao";
const CHAVE_ULTIMA_VERSAO_VISTA = "sis:autoatendimento:ultima-versao-vista";

export default function AtualizacaoDisponivelBanner({
  versaoInicial,
}: AtualizacaoDisponivelBannerProps) {
  const jaNotificouRef = useRef(false);

  useEffect(() => {
    let ativo = true;

    console.log("[SIS atualização] Versão inicial carregada:", versaoInicial);

    const exibirToastAtualizacao = () => {
      if (jaNotificouRef.current) {
        return;
      }

      jaNotificouRef.current = true;
      console.log("[SIS atualização] Nova versão detectada. Exibindo toast.");

      toast.info(
        ({ closeToast }) => (
          <button
            type="button"
            onClick={() => {
              closeToast?.();
              localStorage.setItem(CHAVE_ULTIMA_VERSAO_VISTA, versaoInicial);
              window.location.reload();
            }}
            className="w-full cursor-pointer rounded-2xl px-5 py-4 text-left text-[1rem] leading-6"
          >
            Nova versão do Autoatendimento online. Aperte aqui para atualizar.
          </button>
        ),
        {
          toastId: TOAST_ID_ATUALIZACAO,
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          position: "bottom-center",
          className:
            "!w-[min(92vw,40rem)] !rounded-2xl !border !border-sky-200 !bg-white !text-slate-900 !shadow-[0_18px_50px_rgba(15,23,42,0.18)]",
        },
      );
    };

    const ultimaVersaoVista = localStorage.getItem(CHAVE_ULTIMA_VERSAO_VISTA);

    console.log("[SIS atualização] Última versão vista no navegador:", {
      ultimaVersaoVista,
      versaoInicial,
      mudouDesdeUltimaVisita:
        Boolean(ultimaVersaoVista) && ultimaVersaoVista !== versaoInicial,
    });

    if (ultimaVersaoVista && ultimaVersaoVista !== versaoInicial) {
      console.log(
        "[SIS atualização] Página abriu em uma versão mais nova. Exibindo toast.",
      );
      exibirToastAtualizacao();
    }

    localStorage.setItem(CHAVE_ULTIMA_VERSAO_VISTA, versaoInicial);

    const verificarNovaVersao = async () => {
      try {
        const response = await fetch(`/api/version?ts=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { version?: string };
        const versaoAtual = String(data.version || "").trim();

        console.log("[SIS atualização] Resultado da verificação:", {
          versaoInicial,
          versaoAtual,
          mudou: versaoAtual && versaoAtual !== versaoInicial,
        });

        if (ativo && versaoAtual && versaoAtual !== versaoInicial) {
          exibirToastAtualizacao();
        }
      } catch {
        console.log("[SIS atualização] Falha ao consultar /api/version.");
      }
    };

    const intervalo = window.setInterval(
      () => void verificarNovaVersao(),
      INTERVALO_VERIFICACAO_MS,
    );

    void verificarNovaVersao();

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [versaoInicial]);

  return null;
}
