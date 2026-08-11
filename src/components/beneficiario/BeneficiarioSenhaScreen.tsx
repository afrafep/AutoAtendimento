import React from "react";
import AtendimentoResumoCard from "../AtendimentoResumoCard";
import SenhaAutorizacaoAcoes from "./SenhaAutorizacaoAcoes";
import type { ConsultaAutoAtendimento } from "./autoatendimentoTypes";

interface BeneficiarioSenhaScreenProps {
  consultaSelecionada: ConsultaAutoAtendimento;
  dataConsultasCabecalho: string;
  formatarData: (data?: string) => string;
  formatarHora: (hora?: string) => string;
  senhaPainelDigitada: string;
  atualizarTextoSenhaPainel: (idEvento: number, valor: string) => void;
  vincularSenhaPainel: (consulta: ConsultaAutoAtendimento) => Promise<void>;
  abrirValidacaoTokenDireta: (
    consulta: ConsultaAutoAtendimento,
  ) => Promise<void>;
  voltarParaConsultas: () => void;
}

const BeneficiarioSenhaScreen: React.FC<BeneficiarioSenhaScreenProps> = ({
  consultaSelecionada,
  dataConsultasCabecalho,
  formatarData,
  formatarHora,
  senhaPainelDigitada,
  atualizarTextoSenhaPainel,
  vincularSenhaPainel,
  abrirValidacaoTokenDireta,
  voltarParaConsultas,
}) => (
  <section className="w-full">
    <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-5 text-white md:px-8 md:py-7">
      <div className="mx-auto max-w-6xl text-center md:text-left">
        <div className="text-center md:text-left">
          <h2 className="text-[1.18rem] font-black tracking-tight text-white md:text-[1.72rem]">
            {"AUTORIZAÇÃO"}
          </h2>
          <p className="mt-2 text-[1.6rem] text-blue-100">
            {
              "Confira o atendimento. A senha do painel será gerada e vinculada automaticamente antes de seguir, para autorização."
            }
          </p>
          <p className="mt-2 text-[0.92rem] font-bold uppercase tracking-[0.12em] text-blue-100 md:text-[1rem]">
            {dataConsultasCabecalho && dataConsultasCabecalho !== "--/--/----"
              ? dataConsultasCabecalho
              : "Data do atendimento"}
          </p>
        </div>
      </div>
    </div>

    <div className="px-4 py-5 md:px-8 md:py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <AtendimentoResumoCard
          data={formatarData(consultaSelecionada.dataInicio)}
          hora={formatarHora(consultaSelecionada.horaInicio)}
          profissionalNome={consultaSelecionada.profissionalNome}
          especialidadeNome={consultaSelecionada.especialidadeNome}
          localidadePainel={consultaSelecionada.localidadePainel}
          senhaPainel={consultaSelecionada.senhaPainel}
          senhaPainelDigitada={senhaPainelDigitada}
          onSenhaPainelChange={(value) =>
            atualizarTextoSenhaPainel(consultaSelecionada.idEvento, value)
          }
        />

        <SenhaAutorizacaoAcoes
          autorizado={consultaSelecionada.autorizado}
          tokenValidado={consultaSelecionada.tokenValidado}
          senhaPainel={consultaSelecionada.senhaPainel}
          onVincularSenha={() => void vincularSenhaPainel(consultaSelecionada)}
          onConfirmarToken={() =>
            void abrirValidacaoTokenDireta(consultaSelecionada)
          }
          onSair={voltarParaConsultas}
        />
      </div>
    </div>
  </section>
);

export default BeneficiarioSenhaScreen;
