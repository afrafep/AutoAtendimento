import React from "react";
import type { TokenErroModalState } from "./autoatendimentoTypes";

interface TokenErroModalProps {
  tokenErroModal: TokenErroModalState | null;
  onClose: () => void;
}

const TokenErroModal: React.FC<TokenErroModalProps> = ({
  tokenErroModal,
  onClose,
}) => {
  if (!tokenErroModal) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/28 px-6">
      <div className="w-full max-w-[42rem] rounded-[1.8rem] border border-red-100 bg-white px-8 py-8 shadow-[0_28px_58px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-22 w-22 items-center justify-center rounded-full border-[5px] border-red-200 bg-red-50 text-[3rem] font-black text-red-500">
            ×
          </div>
          <h3 className="mt-6 text-[2.2rem] font-black uppercase tracking-[0.01em] text-red-700">
            {tokenErroModal.titulo}
          </h3>
          <p className="mt-4 max-w-[26rem] text-[1.45rem] leading-8 text-slate-800">
            {tokenErroModal.descricao}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 h-[4rem] min-w-[14rem] rounded-[1.1rem] bg-red-600 px-8 text-[1.2rem] font-black uppercase tracking-[0.04em] text-white transition hover:bg-red-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenErroModal;
