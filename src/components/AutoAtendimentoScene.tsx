"use client";

type AutoAtendimentoSceneVariant = "cpf" | "consultas" | "senha";

interface AutoAtendimentoSceneProps {
  variant?: AutoAtendimentoSceneVariant;
}

const sceneCopy: Record<
  AutoAtendimentoSceneVariant,
  {
    badge: string;
    title: string;
    detail: string;
  }
> = {
  cpf: {
    badge: "IDENTIFICACAO",
    title: "CPF",
    detail: "Inicio rapido",
  },
  consultas: {
    badge: "ATENDIMENTOS",
    title: "Agenda",
    detail: "Selecao simples",
  },
  senha: {
    badge: "PAINEL",
    title: "Senha",
    detail: "Fluxo guiado",
  },
};

const AutoAtendimentoScene = ({
  variant = "cpf",
}: AutoAtendimentoSceneProps) => {
  const copy = sceneCopy[variant];

  return (
    <div className="auto-scene mx-auto w-full max-w-[160px] md:mx-0 md:max-w-[180px]">
      <div className="auto-scene__panel" aria-hidden="true">
        <span className="auto-scene__badge">{copy.badge}</span>
        <div className="auto-scene__symbol">
          <span className="auto-scene__symbol-line auto-scene__symbol-line--horizontal" />
          <span className="auto-scene__symbol-line auto-scene__symbol-line--vertical" />
        </div>
        <div className="auto-scene__copy">
          <p className="auto-scene__title">{copy.title}</p>
          <p className="auto-scene__detail">{copy.detail}</p>
        </div>
      </div>
    </div>
  );
};

export default AutoAtendimentoScene;
