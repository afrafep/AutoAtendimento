interface SenhaAutorizacaoAcoesProps {
  autorizado: boolean;
  tokenValidado: boolean;
  senhaPainel?: string | null;
  onVincularSenha: () => void;
  onConfirmarToken: () => void;
  onSair: () => void;
}

export default function SenhaAutorizacaoAcoes({
  autorizado,
  tokenValidado,
  senhaPainel,
  onVincularSenha,
  onConfirmarToken,
  onSair,
}: SenhaAutorizacaoAcoesProps) {
  return (
    <div className="flex min-h-0 h-full flex-col gap-3">
      {!autorizado && !tokenValidado && (
        <button
          onClick={onVincularSenha}
          className="h-16 bg-[#00338d] px-5 text-[0.95rem] font-black text-white transition hover:bg-[#00286f]"
        >
          {senhaPainel ? "SEGUIR ATENDIMENTO" : "VINCULAR SENHA"}
        </button>
      )}

      {autorizado && !tokenValidado ? (
        <button
          onClick={onConfirmarToken}
          className="h-14 border border-amber-500 bg-amber-100 px-5 text-[0.9rem] font-black text-amber-900 shadow-[0_10px_24px_rgba(217,119,6,0.18)] transition hover:bg-amber-200"
        >
          CONFIRMAR TOKEN
        </button>
      ) : autorizado && tokenValidado ? (
        <div className="flex h-14 items-center justify-center bg-emerald-600 px-5 text-[0.9rem] font-black text-white">
          {"AUTORIZAÇÃO CONCLUÍDA"}
        </div>
      ) : null}

      <button
        onClick={onSair}
        className="h-14 border border-red-200 bg-red-50 px-5 text-[0.88rem] font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 hover:text-red-800"
      >
        SAIR
      </button>
    </div>
  );
}
