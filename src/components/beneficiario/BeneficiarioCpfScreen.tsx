import React, { useRef } from "react";
import { FaHandPointer, FaHeartbeat } from "react-icons/fa";
import CpfTecladoNumerico from "./CpfTecladoNumerico";

interface BeneficiarioCpfScreenProps {
  mostrarTelaBoasVindasCpf: boolean;
  animandoSaidaTelaBoasVindasCpf: boolean;
  abrirEntradaCpf: () => void;
  dataCabecalhoAtual: string;
  horaCabecalhoAtual: string;
  inputCpfRef: React.RefObject<HTMLInputElement | null>;
  cpf: string;
  handleCpfChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCpfKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCpfPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  buscarConsultas: () => Promise<void>;
  setMostrarTecladoCpf: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarTecladoCpf: boolean;
  loading: boolean;
  adicionarDigitoCpf: (digito: string) => void;
  apagarUltimoDigitoCpf: () => void;
}

const BeneficiarioCpfScreen: React.FC<BeneficiarioCpfScreenProps> = ({
  mostrarTelaBoasVindasCpf,
  animandoSaidaTelaBoasVindasCpf,
  abrirEntradaCpf,
  dataCabecalhoAtual,
  horaCabecalhoAtual,
  inputCpfRef,
  cpf,
  handleCpfChange,
  handleCpfKeyDown,
  handleCpfPaste,
  buscarConsultas,
  setMostrarTecladoCpf,
  mostrarTecladoCpf,
  loading,
  adicionarDigitoCpf,
  apagarUltimoDigitoCpf,
}) => {
  const touchStartYRef = useRef<number | null>(null);

  const abrirCampoCpfPorGesto = () => {
    if (!mostrarTelaBoasVindasCpf || animandoSaidaTelaBoasVindasCpf) return;
    abrirEntradaCpf();
  };

  const handleWelcomeTouchStart = (
    event: React.TouchEvent<HTMLButtonElement>,
  ) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleWelcomeTouchMove = (
    event: React.TouchEvent<HTMLButtonElement>,
  ) => {
    const startY = touchStartYRef.current;
    const currentY = event.touches[0]?.clientY ?? null;

    if (startY == null || currentY == null) return;

    if (startY - currentY > 35) {
      touchStartYRef.current = null;
      abrirCampoCpfPorGesto();
    }
  };

  const handleWelcomeWheel = (
    event: React.WheelEvent<HTMLButtonElement>,
  ) => {
    if (event.deltaY > 18) {
      abrirCampoCpfPorGesto();
    }
  };

  return (
    <section className="flex min-h-[100dvh] w-full flex-col">
    {!mostrarTelaBoasVindasCpf ? (
      <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(0,157,255,0.16),transparent_34%),linear-gradient(135deg,#00338d_0%,#0f4db7_52%,#1a78d6_100%)] px-4 py-6 text-white md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl px-2 md:px-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="text-center md:text-left">
              <h2 className="text-[1.45rem] font-black tracking-tight text-white md:text-[2.2rem]">
                {"Digite o CPF do beneficiário"}
              </h2>
              <p className="mt-3 max-w-136 text-[1.6rem] text-blue-100">
                Localize os agendamentos de hoje.
              </p>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="inline-flex min-h-10 flex-col items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-white">
                <p className="text-[0.96rem] font-black uppercase tracking-[0.16em] text-white md:text-[1.02rem]">
                  {`JOÃO PESSOA - ${dataCabecalhoAtual}`}
                </p>
                <p className="mt-1 text-[0.86rem] font-bold uppercase tracking-[0.12em] text-blue-50 md:text-[0.92rem]">
                  {`Horário Atual: ${horaCabecalhoAtual}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null}

    <div
      className={`flex-1 px-3 md:px-6 overflow-hidden ${
        mostrarTelaBoasVindasCpf ? "py-3 md:py-4" : "py-2 md:py-3"
      }`}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <div className="flex min-h-0 h-full flex-1 flex-col gap-3">
          {mostrarTelaBoasVindasCpf ? (
            <button
              type="button"
              onClick={abrirEntradaCpf}
              onTouchStart={handleWelcomeTouchStart}
              onTouchMove={handleWelcomeTouchMove}
              onWheel={handleWelcomeWheel}
              className={`group relative flex min-h-[24rem] h-full w-full flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(231,242,255,0.92)_48%,rgba(217,232,251,0.9)_100%)] px-5 py-4 text-left shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition duration-500 hover:scale-[1.01] hover:shadow-[0_22px_52px_rgba(15,23,42,0.12)] md:min-h-[25.5rem] md:px-7 md:py-4 ${
                animandoSaidaTelaBoasVindasCpf
                  ? "-translate-y-[110%] opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[10%] top-[14%] h-24 w-24 rounded-full bg-cyan-200/35 blur-2xl md:h-32 md:w-32" />
                <div className="absolute right-[12%] top-[18%] h-20 w-20 rounded-full bg-blue-200/35 blur-2xl md:h-28 md:w-28" />
                <div className="absolute bottom-[10%] left-[24%] h-28 w-28 rounded-full bg-sky-100/50 blur-3xl md:h-36 md:w-36" />
              </div>

              <div className="relative mx-auto flex h-full max-w-5xl flex-1 flex-col items-center text-center">
                <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-[#00338d]/10 bg-white/88 px-4 py-2 shadow-[0_10px_24px_rgba(0,51,141,0.08)]">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c81e3a_0%,#ef4444_100%)] text-white shadow-[0_8px_18px_rgba(200,30,58,0.28)]">
                    <FaHeartbeat className="text-[1.05rem]" />
                  </span>
                  <div className="text-left">
                    <p className="text-[0.74rem] font-black uppercase tracking-[0.18em] text-[#4f7bc6]">
                      TELA INICIAL
                    </p>
                    <p className="text-[1.18rem] font-black tracking-[0.03em] text-[#00338d] md:text-[1.45rem]">
                      Afrafep Saúde
                    </p>
                  </div>
                </div>

                <h2 className="max-w-3xl text-[1.72rem] font-black tracking-tight text-[#0f2d78] md:text-[2.32rem]">
                  Bem-vindo ao autoatendimento
                </h2>
                <div className="mt-6 flex w-full max-w-5xl flex-1 flex-col justify-center rounded-[2.2rem] border-2 border-cyan-100 bg-white/96 px-6 py-8 text-center shadow-[0_18px_34px_rgba(15,23,42,0.08)] md:min-h-[22rem] md:px-10 md:py-10">
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <span className="inline-flex h-18 w-18 items-center justify-center rounded-full bg-[linear-gradient(135deg,#123a97_0%,#2957d3_52%,#3eb6f4_100%)] text-white shadow-[0_16px_28px_rgba(0,51,141,0.20)] md:h-20 md:w-20">
                      <FaHandPointer className="text-[1.7rem] md:text-[2rem]" />
                    </span>
                    <p className="text-[1.35rem] font-black text-[#16357f] md:text-[2rem]">
                      Toque ou deslize para começar
                    </p>
                    <p className="max-w-3xl text-[1rem] font-black leading-relaxed text-slate-700 md:text-[1.25rem]">
                      Toque na tela ou deslize para cima para abrir o campo do CPF.
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <>
              <div>
                <div className="bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] md:p-2.5">
                  <input
                    ref={inputCpfRef}
                    id="beneficiario-cpf"
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    value={cpf}
                    onChange={handleCpfChange}
                    onFocus={() => setMostrarTecladoCpf(true)}
                    onClick={() => setMostrarTecladoCpf(true)}
                    onKeyDown={(event) => {
                      handleCpfKeyDown(event);
                      if (event.key === "Enter") {
                        void buscarConsultas();
                      }
                    }}
                    onPaste={handleCpfPaste}
                    placeholder="000.000.000-00"
                    pattern="[0-9]*"
                    className="h-[4.25rem] w-full border-0 bg-slate-50 px-6 text-center text-[1.26rem] font-black tracking-[0.12em] text-slate-900 outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00338d]/10 md:h-[4.75rem] md:text-[1.62rem]"
                  />
                </div>
              </div>

              {mostrarTecladoCpf ? (
                <CpfTecladoNumerico
                  loading={loading}
                  onAdicionarDigito={adicionarDigitoCpf}
                  onApagarUltimo={apagarUltimoDigitoCpf}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  </section>
  );
};

export default BeneficiarioCpfScreen;
