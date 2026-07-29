"use client";

interface AtendimentoResumoCardProps {
  data: string;
  hora: string;
  profissionalNome: string;
  especialidadeNome: string;
  localidadePainel?: string | null;
  senhaPainel?: string | null;
  senhaPainelDigitada?: string;
  onSenhaPainelChange?: (value: string) => void;
}

const AtendimentoResumoCard = ({
  data,
  hora,
  profissionalNome,
  especialidadeNome,
  localidadePainel,
  senhaPainel,
  senhaPainelDigitada = "",
  onSenhaPainelChange,
}: AtendimentoResumoCardProps) => {
  const localVisivel =
    localidadePainel &&
    String(localidadePainel).trim().toLowerCase() !== "nao informado"
      ? localidadePainel
      : null;

  const senhaVinculada = String(senhaPainel || "").trim();

  return (
    <div className="overflow-hidden bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[1fr_17rem]">
        <div className="px-5 py-6 text-center md:px-8 md:py-8 lg:px-10">
          <p className="text-[0.95rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {data}
          </p>
          <p className="mt-2 text-[3.1rem] font-black tracking-tight text-[#00338d] md:text-[4rem]">
            {hora}
          </p>
          <p className="mt-5 text-[1.05rem] font-black uppercase text-slate-900 md:text-[1.18rem]">
            {profissionalNome}
          </p>
          <p className="mt-1 text-[1rem] text-slate-600">{especialidadeNome}</p>
          {localVisivel ? (
            <p className="mt-3 text-[0.9rem] font-medium text-slate-500">
              {localVisivel}
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-5 lg:border-l lg:border-t-0 lg:px-5 lg:py-6">
          <div className="flex h-full flex-col justify-center rounded-[1.15rem] border border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <p className="text-center text-[0.72rem] font-black uppercase tracking-[0.2em] text-slate-500">
              Senha do painel
            </p>

            {senhaVinculada ? (
              <>
                <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                  <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Senha ja vinculada
                  </p>
                  <p className="mt-2 text-[2rem] font-black uppercase tracking-[0.18em] text-emerald-800 md:text-[2.3rem]">
                    {senhaVinculada}
                  </p>
                </div>
                <p className="mt-3 text-center text-[0.78rem] font-medium text-slate-500">
                  Atendimento pronto para seguir.
                </p>
              </>
            ) : (
              <>
                <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <input
                    id="senha-painel"
                    type="text"
                    value={senhaPainelDigitada}
                    onChange={(event) => onSenhaPainelChange?.(event.target.value)}
                    placeholder="DIGITE A SENHA"
                    maxLength={10}
                    className="h-[4.4rem] w-full border-0 bg-white px-3 text-center text-[1.2rem] font-black uppercase tracking-[0.14em] text-slate-900 outline-none transition focus:ring-4 focus:ring-[#00338d]/10"
                  />
                </div>
                <p className="mt-3 text-center text-[0.78rem] font-medium text-slate-500">
                  Digite a senha do totem para vincular ao atendimento.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtendimentoResumoCard;
