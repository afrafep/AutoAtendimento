export default function AutorizacaoPreparandoCard() {
  return (
    <div className="mt-2 rounded-[1rem] border border-blue-200 bg-[linear-gradient(135deg,rgba(219,234,254,0.82)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 text-center shadow-[0_14px_28px_rgba(59,130,246,0.14)]">
      <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#00338d]/10">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#00338d]/20 border-t-[#00338d]" />
      </div>
      <p className="mt-3 text-[1.04rem] font-black uppercase tracking-[0.06em] text-[#00338d] md:text-[1.12rem]">
        {"Registrando que voc\u00ea compareceu"}
      </p>
      <p className="mt-2 text-[0.9rem] text-slate-600 md:text-[0.96rem]">
        {"Estamos enviando seu token."}
      </p>
    </div>
  );
}
