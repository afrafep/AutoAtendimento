"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

type AtualizacaoDisponivelBannerProps = {
  versaoInicial: string;
};

const INTERVALO_VERIFICACAO_MS = 60_000;
const TOAST_ID_ATUALIZACAO = "sis-nova-versao";

export default function AtualizacaoDisponivelBanner({
  versaoInicial,
}: AtualizacaoDisponivelBannerProps) {
  const jaNotificouRef = useRef(false);

  useEffect(() => {
    let ativo = true;

    const exibirToastAtualizacao = () => {
      if (jaNotificouRef.current) {
        return;
      }

      jaNotificouRef.current = true;

      toast.info(
        ({ closeToast }) => (
          <button
            type="button"
            onClick={() => {
              closeToast?.();
              window.location.reload();
            }}
            className="w-full cursor-pointer rounded-2xl px-5 py-4 text-left text-[1rem] leading-6"
          >
            Existe uma nova atualização do SIS. Aperte aqui para atualizar para a nova versão.
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

        if (ativo && versaoAtual && versaoAtual !== versaoInicial) {
          exibirToastAtualizacao();
        }
      } catch {
        // Ignora falhas temporárias de rede e tenta novamente no próximo ciclo.
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
