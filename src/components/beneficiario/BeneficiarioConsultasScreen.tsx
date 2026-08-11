import React from "react";
import ConsultasHeader from "./ConsultasHeader";
import ConsultaFluxoNavegacao from "./ConsultaFluxoNavegacao";

interface BeneficiarioConsultasScreenProps {
  pacienteNome: string;
  dataConsultasCabecalho: string;
  onSair: () => void;
  mensagemFluxo: string;
  totalConsultas: number;
  indiceConsultaAtual: number;
  children: React.ReactNode;
  indiceMaximoLiberado: number;
  setIndiceConsultaAtual: React.Dispatch<React.SetStateAction<number>>;
}

const BeneficiarioConsultasScreen: React.FC<
  BeneficiarioConsultasScreenProps
> = ({
  pacienteNome,
  dataConsultasCabecalho,
  onSair,
  mensagemFluxo,
  totalConsultas,
  indiceConsultaAtual,
  children,
  indiceMaximoLiberado,
  setIndiceConsultaAtual,
}) => (
  <section className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
    <div className="sticky top-0 z-30 w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-4 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-[linear-gradient(135deg,rgba(0,51,141,0.94)_0%,rgba(15,77,183,0.94)_52%,rgba(26,120,214,0.94)_100%)] md:px-8 md:py-5">
      <ConsultasHeader
        pacienteNome={pacienteNome}
        dataConsultasCabecalho={dataConsultasCabecalho}
        onSair={onSair}
      />
    </div>

    <div className="flex-1 overflow-hidden px-3 pb-2 pt-2 md:px-5 md:pb-3 md:pt-2.5">
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-1.5 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-3 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] md:px-4 md:py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[1.08rem] font-bold leading-[1.45] text-slate-700 md:text-[1.52rem]">
              {mensagemFluxo}
            </p>

            {totalConsultas > 1 ? (
              <span className="text-[1.4rem] font-black text-[#00338d] md:text-[2rem]">
                {indiceConsultaAtual + 1}/{totalConsultas}
              </span>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>

        <ConsultaFluxoNavegacao
          podeVoltar={indiceConsultaAtual > 0}
          podeAvancar={indiceConsultaAtual < indiceMaximoLiberado}
          onVoltar={() =>
            setIndiceConsultaAtual((valorAtual) => Math.max(valorAtual - 1, 0))
          }
          onAvancar={() =>
            setIndiceConsultaAtual((valorAtual) =>
              Math.min(valorAtual + 1, indiceMaximoLiberado),
            )
          }
        />
      </div>
    </div>
  </section>
);

export default BeneficiarioConsultasScreen;
