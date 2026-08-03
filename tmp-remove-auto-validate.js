const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
`  setTimeout(() => {
    focarCampoTokenInline(idEvento, proximoToken.length >= 4 ? 3 : proximoToken.length);

    if (proximoToken.length === 4) {
      void validarTokenInline(consulta);
    }
  }, 0);`,
`  setTimeout(() => {
    focarCampoTokenInline(idEvento, proximoToken.length >= 4 ? 3 : proximoToken.length);
  }, 0);`
);

fs.writeFileSync(path, s, "utf8");
