const fs = require("fs");
const path = "C:\\Gitlab\\sisclinic-autoatendimento\\src\\components\\BeneficiarioAutoAtendimento.tsx";
let s = fs.readFileSync(path, "utf8");
s = s.replace(/Digite os 4 d.+?gitos do token\./g, "Digite os 4 dígitos do token.");
s = s.replace(/TECLADO NUM.+?RICO/g, "TECLADO NUMÉRICO");
s = s.replace(/ATEN.+?O/g, "ATENÇÃO");
s = s.replace(/Atendimento indispon.+?vel/g, "Atendimento indisponível");
s = s.replace(/setConsultaTokenAbertaId\(null\);\r?\n\s*await buscarConsultas\(\);/, "setConsultaTokenAbertaId(null);\n    setConsultaTecladoTokenId(null);\n    await buscarConsultas();");
fs.writeFileSync(path, s, "utf8");
