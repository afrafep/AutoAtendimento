"use client";

import type { Dispatch, KeyboardEvent, ClipboardEvent, SetStateAction } from "react";
import Swal from "sweetalert2";
import { TokenEnviar } from "../TokenEnviar";
import { api } from "../../config/configApi";
import {
  BLOQUEIO_REENVIO_TOKEN_MS,
  extrairRetornoApiToken,
  formatarHora,
  normalizarMensagemTokenInline,
  obterTextoAguardarChamada,
  resolveNumeroGuiaOperadoraInline,
  toSafeTokenString,
  type TokenFeedbackInline,
} from "./autoatendimentoHelpers";
import type {
  ConsultaAutoAtendimento,
  TokenErroModalState,
} from "./autoatendimentoTypes";

type SetState<T> = Dispatch<SetStateAction<T>>;

interface CreateTokenInlineActionsParams {
  tokenDigitadoPorConsulta: Record<number, string>;
  tokenErroModal: TokenErroModalState | null;
  setTokenDigitadoPorConsulta: SetState<Record<number, string>>;
  setTokenErroPorConsulta: SetState<Record<number, string>>;
  setTokenFeedbackPorConsulta: SetState<
    Record<number, TokenFeedbackInline | undefined>
  >;
  setConsultaReenviandoTokenId: SetState<number | null>;
  setConsultaValidandoTokenId: SetState<number | null>;
  setConsultaErroToastAtivoId: SetState<number | null>;
  setTokenErroModal: SetState<TokenErroModalState | null>;
  setConsultaTecladoTokenId: SetState<number | null>;
  setConsultaTokenAbertaId: SetState<number | null>;
  setConsultaProcessandoSenhaId: SetState<number | null>;
  setBloqueioReenvioAtePorConsulta: SetState<Record<number, number>>;
  setAbrirTokenInlineAposEnvio: SetState<boolean>;
  buscarConsultas: () => Promise<void>;
  atualizarConsultaLocal: (
    idEvento: number,
    changes: Partial<ConsultaAutoAtendimento>,
  ) => void;
}

export const createTokenInlineActions = ({
  tokenDigitadoPorConsulta,
  tokenErroModal,
  setTokenDigitadoPorConsulta,
  setTokenErroPorConsulta,
  setTokenFeedbackPorConsulta,
  setConsultaReenviandoTokenId,
  setConsultaValidandoTokenId,
  setConsultaErroToastAtivoId,
  setTokenErroModal,
  setConsultaTecladoTokenId,
  setConsultaTokenAbertaId,
  setConsultaProcessandoSenhaId,
  setBloqueioReenvioAtePorConsulta,
  setAbrirTokenInlineAposEnvio,
  buscarConsultas,
  atualizarConsultaLocal,
}: CreateTokenInlineActionsParams) => {
  const limparMensagemTokenInline = (idEvento: number) => {
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [idEvento]: "",
    }));
    setTokenFeedbackPorConsulta((prev) => ({
      ...prev,
      [idEvento]: undefined,
    }));
  };

  const atualizarFeedbackTokenInline = (
    idEvento: number,
    tipo: TokenFeedbackInline["tipo"],
    mensagem: string,
  ) => {
    setTokenFeedbackPorConsulta((prev) => ({
      ...prev,
      [idEvento]: { tipo, mensagem },
    }));
    setTokenErroPorConsulta((prev) => ({
      ...prev,
      [idEvento]: "",
    }));
  };

  const focarCampoTokenInline = (idEvento: number, indice: number) => {
    if (typeof document === "undefined") return;
    const target = document.getElementById(
      `token-inline-${idEvento}-${indice}`,
    ) as HTMLInputElement | null;
    target?.focus();
    target?.select();
  };

  const abrirTecladoTokenInline = (idEvento: number, indice = 0) => {
    setConsultaTecladoTokenId(idEvento);
    setTimeout(() => focarCampoTokenInline(idEvento, indice), 0);
  };

  const fecharTecladoTokenInline = () => {
    setConsultaTecladoTokenId(null);
  };

  const atualizarTokenDigitadoInline = (
    idEvento: number,
    indice: number,
    valor: string,
  ) => {
    const digito = valor.replace(/\D/g, "").slice(-1);

    setTokenDigitadoPorConsulta((prev) => {
      const atual = Array.from(
        { length: 4 },
        (_, posicao) => prev[idEvento]?.[posicao] || "",
      );
      atual[indice] = digito;
      return {
        ...prev,
        [idEvento]: atual.join("").slice(0, 4),
      };
    });

    limparMensagemTokenInline(idEvento);

    if (digito && indice < 3) {
      setTimeout(() => focarCampoTokenInline(idEvento, indice + 1), 0);
    }
  };

  const handleTokenInlineKeyDown = (
    idEvento: number,
    indice: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const tokenAtual = tokenDigitadoPorConsulta[idEvento] || "";

      if (tokenAtual[indice]) {
        atualizarTokenDigitadoInline(idEvento, indice, "");
        return;
      }

      if (indice > 0) {
        atualizarTokenDigitadoInline(idEvento, indice - 1, "");
        setTimeout(() => focarCampoTokenInline(idEvento, indice - 1), 0);
      }
      return;
    }

    if (event.key === "ArrowLeft" && indice > 0) {
      event.preventDefault();
      focarCampoTokenInline(idEvento, indice - 1);
      return;
    }

    if (event.key === "ArrowRight" && indice < 3) {
      event.preventDefault();
      focarCampoTokenInline(idEvento, indice + 1);
      return;
    }

    if (event.key === "Tab") {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleTokenInlinePaste = (
    idEvento: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) => {
    event.preventDefault();
    const numeros = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    setTokenDigitadoPorConsulta((prev) => ({
      ...prev,
      [idEvento]: numeros,
    }));
    limparMensagemTokenInline(idEvento);
    const ultimoIndice = Math.min(Math.max(numeros.length - 1, 0), 3);
    setTimeout(() => focarCampoTokenInline(idEvento, ultimoIndice), 0);
  };

  const finalizarFluxoTokenInline = async (idEvento: number) => {
    await buscarConsultas();

    setConsultaProcessandoSenhaId(null);
    setConsultaTokenAbertaId(idEvento);
    setBloqueioReenvioAtePorConsulta((prev) => ({
      ...prev,
      [idEvento]: prev[idEvento] || Date.now() + BLOQUEIO_REENVIO_TOKEN_MS,
    }));
    setAbrirTokenInlineAposEnvio(false);
  };

  const exibirModalErroTokenInline = async (
    idEvento: number,
    mensagem: string,
  ) => {
    const mensagemNormalizada = String(mensagem || "").trim();
    const titulo =
      mensagemNormalizada.toLowerCase() ===
        "token errado. insira um token correto." ||
      mensagemNormalizada.toLowerCase() === "token inválido" ||
      mensagemNormalizada.toLowerCase() === "token invalido"
        ? "TOKEN INVÁLIDO"
        : "ERRO AO VALIDAR TOKEN";

    const descricao =
      titulo === "TOKEN INVÁLIDO"
        ? "Token errado. Insira um token correto."
        : mensagemNormalizada || "Não foi possível validar o token.";

    if (titulo === "TOKEN INVÁLIDO") {
      setTokenDigitadoPorConsulta((prev) => ({
        ...prev,
        [idEvento]: "",
      }));
    }

    setConsultaErroToastAtivoId(idEvento);
    setTokenErroModal({ idEvento, titulo, descricao });
    await Promise.resolve();
  };

  const reenviarTokenInline = async (consulta: ConsultaAutoAtendimento) => {
    const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
    const numeroGuiaOperadora = Number(
      consulta.numeroGuiaOperadora || consulta.senhaAutorizacao || 0,
    );

    if (!senhaGuia) {
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]:
          "Não encontramos a senha da guia para reenviar o token.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "Não encontramos a senha da guia para reenviar o token.",
      );
    }

    limparMensagemTokenInline(consulta.idEvento);
    setConsultaReenviandoTokenId(consulta.idEvento);

    try {
      const reenviado = await TokenEnviar({
        nome: consulta.pacienteNome,
        nrCarteiraPlano: consulta.nrCarteiraPlano,
        senhaGuia,
        numeroGuiaGerado: consulta.numeroGuiaGerado || undefined,
        numeroGuiaOperadora,
        isReenvio: true,
        silencioso: true,
      });

      if (reenviado === false) {
        setTokenErroPorConsulta((prev) => ({
          ...prev,
          [consulta.idEvento]: "Não foi possível reenviar o token agora.",
        }));
        await exibirModalErroTokenInline(
          consulta.idEvento,
          "Não foi possível reenviar o token agora.",
        );
        return;
      }

      setBloqueioReenvioAtePorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: Date.now() + BLOQUEIO_REENVIO_TOKEN_MS,
      }));

      atualizarFeedbackTokenInline(
        consulta.idEvento,
        "success",
        "Token reenviado com sucesso. Veja o novo código no celular.",
      );
      await Swal.fire({
        title: "TOKEN REENVIADO",
        text: "Um novo código foi enviado para o seu celular, pelo aplicativo ou por SMS.",
        icon: "success",
        confirmButtonText: "Fechar",
        allowOutsideClick: false,
        background: "#ffffff",
        color: "#0f172a",
        customClass: {
          popup: "!rounded-[1.2rem] !px-6 !py-5",
          title: "!text-[1.5rem] !font-black !text-emerald-700",
          confirmButton:
            "!bg-emerald-600 !text-white !font-black !rounded-[0.9rem] !px-6 !py-3",
        },
      });
    } catch (_error) {
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: "Não foi possível reenviar o token agora.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "Não foi possível reenviar o token agora.",
      );
    } finally {
      setConsultaReenviandoTokenId(null);
    }
  };

  const exibirModalSucessoELiberarConsulta = async (
    consulta: ConsultaAutoAtendimento,
  ) => {
    const textoAguardarChamada = obterTextoAguardarChamada(consulta.flSexo);

    await Swal.fire({
      title: "✅ ATENDIMENTO LIBERADO!",
      html: `
        <div style="text-align: center; padding: 12px 0 8px;">
          <p style="font-size: 2.2rem; line-height: 1.15; margin-bottom: 18px;"><strong>${consulta.pacienteNome}</strong></p>
          <p style="color: #475569; font-size: 1.8rem; line-height: 1.26; margin-bottom: 10px;">📋 ${consulta.profissionalNome}</p>
          <p style="color: #475569; font-size: 1.68rem; line-height: 1.26; margin-bottom: 10px;">🏥 ${consulta.especialidadeNome}</p>
          <p style="color: #00338d; font-weight: bold; font-size: 2.2rem; margin-top: 14px; margin-bottom: 12px;">
            🕐 ${formatarHora(consulta.horaInicio)}
          </p>
          <p style="color: #64748b; font-size: 2rem; font-weight: 800; line-height: 1.18; margin-top: 14px;">
            ${textoAguardarChamada}
          </p>
        </div>
      `,
      icon: "success",
      confirmButtonText: "OK, ENTENDI",
      allowOutsideClick: false,
      background: "#ffffff",
      color: "#0f172a",
      customClass: {
        popup:
          "!rounded-[1.75rem] !w-[min(92vw,56rem)] !max-w-[56rem] !px-10 !py-8 !flex !flex-col !justify-center",
        title: "!text-[2.85rem] !leading-tight !font-black !text-emerald-700",
        confirmButton:
          "!bg-emerald-600 !text-white !font-black !rounded-[1rem] !px-12 !py-4 !text-[1.35rem] !mt-5",
      },
    });
  };

  const validarTokenInline = async (consulta: ConsultaAutoAtendimento) => {
    const token = String(
      tokenDigitadoPorConsulta[consulta.idEvento] || "",
    ).replace(/\D/g, "");
    const senhaGuia = String(consulta.senhaAutorizacao || "").trim();
    const numeroGuiaOperadora = resolveNumeroGuiaOperadoraInline(
      senhaGuia,
      consulta.numeroGuiaOperadora,
    );

    if (token.length !== 4) {
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: "Digite os 4 dígitos do token.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "Digite os 4 dígitos do token.",
      );
      return;
    }
    if (!senhaGuia) {
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]:
          "Não encontramos a senha da guia para validar o token.",
      }));
      await exibirModalErroTokenInline(
        consulta.idEvento,
        "Não encontramos a senha da guia para validar o token.",
      );
      return;
    }
    limparMensagemTokenInline(consulta.idEvento);
    setConsultaValidandoTokenId(consulta.idEvento);

    try {
      const response = await api.post("/sisclinic/token/validar", {
        token: toSafeTokenString(token),
        cdBeneficiario: toSafeTokenString(consulta.nrCarteiraPlano),
        numeroGuiaOperadora,
      });

      const retornoApi = extrairRetornoApiToken(response.data);
      const mensagem = normalizarMensagemTokenInline(retornoApi.mensagem || "");
      const mensagemLower = mensagem.toLowerCase();

      const tokenValidado =
        mensagemLower.includes("token validado com sucesso") ||
        mensagemLower.includes("senha ja validada com envio de token") ||
        (mensagemLower.includes("transação") &&
          mensagemLower.includes("já foi enviada com sucesso"));

      if (!tokenValidado) {
        const mensagemErro =
          mensagem || "Não foi possível validar o token informado.";
        setTokenErroPorConsulta((prev) => ({
          ...prev,
          [consulta.idEvento]: mensagemErro,
        }));
        await exibirModalErroTokenInline(consulta.idEvento, mensagemErro);
        return;
      }

      await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
        tokenValidado: true,
      });

      setTokenDigitadoPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: "",
      }));
      atualizarFeedbackTokenInline(
        consulta.idEvento,
        "success",
        "Token validado com sucesso. Atendimento liberado.",
      );
      setConsultaTokenAbertaId(null);
      setConsultaTecladoTokenId(null);
      setConsultaProcessandoSenhaId(null);

      await buscarConsultas();
      await exibirModalSucessoELiberarConsulta(consulta);
    } catch (error: any) {
      const mensagemErro = String(
        error?.response?.data?.mensagem || error?.message || "",
      ).toLowerCase();
      const tokenInvalido =
        mensagemErro.includes("token invalido") ||
        mensagemErro.includes("token inválido") ||
        mensagemErro.includes("ora-20400");
      const tokenJaConfirmado =
        mensagemErro.includes("senha ja validada com envio de token") ||
        mensagemErro.includes("senha já validada com envio de token") ||
        (mensagemErro.includes("transação") &&
          mensagemErro.includes("já foi enviada com sucesso")) ||
        (mensagemErro.includes("transacao") &&
          mensagemErro.includes("ja foi enviada com sucesso"));

      if (tokenInvalido) {
        const mensagem = "Token errado. Insira um token correto.";
        setTokenErroPorConsulta((prev) => ({
          ...prev,
          [consulta.idEvento]: mensagem,
        }));
        await exibirModalErroTokenInline(consulta.idEvento, mensagem);
        return;
      }

      if (tokenJaConfirmado) {
        try {
          const { data: consultaAtual } = await api.get(
            `/sisclinic/agenda/${consulta.idEvento}`,
          );

          if (!consultaAtual?.tokenValidado) {
            await api.patch(`/sisclinic/agenda/${consulta.idEvento}`, {
              tokenValidado: true,
            });
          }

          atualizarConsultaLocal(consulta.idEvento, {
            tokenValidado: true,
            autorizado: true,
            erroAutorizacao: false,
            mensagemErroAutorizacao: undefined,
          });

          setTokenDigitadoPorConsulta((prev) => ({
            ...prev,
            [consulta.idEvento]: "",
          }));
          atualizarFeedbackTokenInline(
            consulta.idEvento,
            "success",
            "Atendimento liberado!",
          );
          setConsultaTokenAbertaId(null);
          setConsultaTecladoTokenId(null);
          setConsultaProcessandoSenhaId(null);

          await buscarConsultas();
          await exibirModalSucessoELiberarConsulta(consulta);
        } catch (patchError) {
          console.error("Erro ao atualizar tokenValidado:", patchError);
          try {
            await exibirModalSucessoELiberarConsulta(consulta);
          } catch (_modalError) {
            setTokenErroPorConsulta((prev) => ({
              ...prev,
              [consulta.idEvento]: "Consulta liberada! Procure a recepção.",
            }));
          }
        }
        return;
      }

      const retornoApi = extrairRetornoApiToken(error?.response?.data);
      const mensagem = normalizarMensagemTokenInline(
        retornoApi.mensagem || error?.message || "Erro ao validar token",
      );
      setTokenErroPorConsulta((prev) => ({
        ...prev,
        [consulta.idEvento]: mensagem,
      }));
      await exibirModalErroTokenInline(consulta.idEvento, mensagem);
    } finally {
      setConsultaValidandoTokenId(null);
    }
  };

  const preencherTokenViaTecladoInline = (
    consulta: ConsultaAutoAtendimento,
    digito: string,
  ) => {
    const idEvento = consulta.idEvento;
    const numero = String(digito).replace(/\D/g, "").slice(-1);

    if (!numero) {
      return;
    }

    let proximoToken = "";

    setTokenDigitadoPorConsulta((prev) => {
      const tokenAtual = String(prev[idEvento] || "")
        .replace(/\D/g, "")
        .slice(0, 4);
      if (tokenAtual.length >= 4) {
        proximoToken = tokenAtual;
        return prev;
      }

      proximoToken = tokenAtual + numero;
      return {
        ...prev,
        [idEvento]: proximoToken,
      };
    });

    limparMensagemTokenInline(idEvento);

    setTimeout(() => {
      focarCampoTokenInline(
        idEvento,
        proximoToken.length >= 4 ? 3 : proximoToken.length,
      );
    }, 0);
  };

  const limparTokenViaTecladoInline = (idEvento: number) => {
    setTokenDigitadoPorConsulta((prev) => ({
      ...prev,
      [idEvento]: "",
    }));
    limparMensagemTokenInline(idEvento);
    setTimeout(() => focarCampoTokenInline(idEvento, 0), 0);
  };

  const fecharModalErroTokenInline = () => {
    if (!tokenErroModal) {
      return;
    }

    const { idEvento } = tokenErroModal;
    setConsultaErroToastAtivoId((atual) => (atual === idEvento ? null : atual));
    setTokenErroModal(null);
    setTimeout(() => focarCampoTokenInline(idEvento, 0), 0);
  };

  return {
    limparMensagemTokenInline,
    atualizarFeedbackTokenInline,
    focarCampoTokenInline,
    abrirTecladoTokenInline,
    fecharTecladoTokenInline,
    atualizarTokenDigitadoInline,
    handleTokenInlineKeyDown,
    handleTokenInlinePaste,
    finalizarFluxoTokenInline,
    reenviarTokenInline,
    exibirModalErroTokenInline,
    fecharModalErroTokenInline,
    validarTokenInline,
    preencherTokenViaTecladoInline,
    limparTokenViaTecladoInline,
  };
};
