"use client";

import { useEffect, useRef, useState } from "react";

type AtualizacaoDisponivelBannerProps = {
  versaoInicial: string;
};

const INTERVALO_VERIFICACAO_MS = 40_000;
const CHAVE_ULTIMA_VERSAO_VISTA = "sis:autoatendimento:ultima-versao-vista";
const CONTAGEM_ATUALIZACAO_SEGUNDOS = 5;

type ModalAtualizacaoProps = {
  segundosRestantes: number;
  onAtualizarAgora: () => void;
};

function ModalAtualizacao({
  segundosRestantes,
  onAtualizarAgora,
}: ModalAtualizacaoProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-black px-8 py-8 text-white shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
        <div className="text-center">
          <div className="text-[1.6rem] font-black leading-tight sm:text-[1.9rem]">
            Nova versão do Autoatendimento online
          </div>
          <p className="mt-4 text-lg font-semibold leading-8 text-white/90 sm:text-xl">
            Atualizando o sistema para a nova versão em{" "}
            <span className="font-black text-white">{segundosRestantes}</span>{" "}
            segundos...
          </p>
          <button
            type="button"
            onClick={onAtualizarAgora}
            className="mt-6 inline-flex min-h-[3.6rem] items-center justify-center rounded-full bg-white px-8 text-base font-black text-black transition hover:bg-white/90"
          >
            Atualizar agora
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AtualizacaoDisponivelBanner({
  versaoInicial,
}: AtualizacaoDisponivelBannerProps) {
  const jaNotificouRef = useRef(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(
    CONTAGEM_ATUALIZACAO_SEGUNDOS,
  );

  const atualizarAgora = () => {
    localStorage.setItem(CHAVE_ULTIMA_VERSAO_VISTA, versaoInicial);
    window.location.reload();
  };

  useEffect(() => {
    if (!mostrarModal) {
      return;
    }

    const intervalo = window.setInterval(() => {
      setSegundosRestantes((atual) => {
        if (atual <= 1) {
          window.clearInterval(intervalo);
          atualizarAgora();
          return 0;
        }

        return atual - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [mostrarModal]);

  useEffect(() => {
    if (!mostrarModal) {
      return;
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [mostrarModal]);

  useEffect(() => {
    let ativo = true;

    console.log("[SIS atualização] Versão inicial carregada:", versaoInicial);

    const exibirModalAtualizacao = () => {
      if (jaNotificouRef.current) {
        return;
      }

      jaNotificouRef.current = true;
      setSegundosRestantes(CONTAGEM_ATUALIZACAO_SEGUNDOS);
      setMostrarModal(true);
      console.log("[SIS atualização] Nova versão detectada. Exibindo modal.");
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
        "[SIS atualização] Página abriu em uma versão mais nova. Exibindo modal.",
      );
      exibirModalAtualizacao();
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
          exibirModalAtualizacao();
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

  if (!mostrarModal) {
    return null;
  }

  return (
    <ModalAtualizacao
      segundosRestantes={segundosRestantes}
      onAtualizarAgora={atualizarAgora}
    />
  );
}
