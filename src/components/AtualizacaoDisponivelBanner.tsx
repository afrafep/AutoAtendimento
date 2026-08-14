"use client";

import { useEffect, useState } from "react";

type AtualizacaoDisponivelBannerProps = {
  versaoInicial: string;
};

const INTERVALO_VERIFICACAO_MS = 60_000;

export default function AtualizacaoDisponivelBanner({
  versaoInicial,
}: AtualizacaoDisponivelBannerProps) {
  const [novaVersaoDisponivel, setNovaVersaoDisponivel] = useState(false);

  useEffect(() => {
    let ativo = true;

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
          setNovaVersaoDisponivel(true);
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

  if (!novaVersaoDisponivel) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed inset-x-4 bottom-4 z-[9999] mx-auto flex w-[min(92vw,32rem)] items-center justify-center rounded-2xl border border-sky-300 bg-[linear-gradient(135deg,#00338d_0%,#0f6cbd_100%)] px-5 py-4 text-center text-sm font-black text-white shadow-[0_18px_50px_rgba(0,51,141,0.35)] transition-transform duration-200 hover:scale-[1.01]"
    >
      Existe uma nova atualização do SIS. Aperte aqui para atualizar para a nova versão.
    </button>
  );
}
