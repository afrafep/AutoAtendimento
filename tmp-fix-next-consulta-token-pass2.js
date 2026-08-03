const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  `                              const podeSeguir = podeAutorizar || tokenEnviado || autorizacaoConcluida;
                              const processandoSenha = consultaProcessandoSenhaId === consulta.idEvento;
                              const tokenAberto = consultaTokenAbertaId === consulta.idEvento;
                              const tokenInlineVisivel =
                                !autorizacaoConcluida &&
                                (processandoSenha || tokenEnviado || (tokenAberto && consulta.autorizado));`,
  `                              const processandoSenha = consultaProcessandoSenhaId === consulta.idEvento;
                              const tokenAberto = consultaTokenAbertaId === consulta.idEvento;
                              const tokenEnviadoNoFluxo = tokenAberto && consulta.autorizado;
                              const tokenInlineVisivel = !autorizacaoConcluida && (processandoSenha || tokenAberto);
                              const podeSeguir = podeAutorizar || tokenInlineVisivel || autorizacaoConcluida;`,
);

s = s.replace(
  `                              const { cardConsulta, consulta, tokenEnviado, autorizacaoConcluida } = consultaFluxoAtual;`,
  `                              const { cardConsulta, consulta, autorizacaoConcluida } = consultaFluxoAtual;`,
);

fs.writeFileSync(path, s, "utf8");
