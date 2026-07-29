# sisclinic-autoatendimento

Projeto isolado do fluxo de autoatendimento do beneficiario, agora estruturado em Next.js App Router.

## Rotas

- `/`
- `/beneficiario`

## Arquitetura de autenticacao

O navegador nao fala direto com Sisclinic, Intelite ou LogicMed.

Fluxo:

- Navegador
- Route Handlers do Next.js em `src/app/api`
- Backends externos usando tokens mantidos apenas no servidor

## Variaveis de ambiente

Use o arquivo `.env.example` como modelo.

Segredos obrigatorios no servidor:

- `SISCLINIC_API_BASE_URL`
- `SISCLINIC_LOGIN_TOKEN`
- `INTELITE_BASE_URL`
- `INTELITE_TOKEN`
- `INTELITE_UNIDADE`
- `INTELITE_CNPJ`
- `LOGIC_BASE_URL`
- `LOGIC_UUID`
- `LOGIC_CLIENT_ID`
- `LOGIC_CLIENT_SECRET`

Importante:

- `SISCLINIC_LOGIN_TOKEN` e o token tecnico de login/autenticacao do Sisclinic e fica apenas no servidor
- `senhaAutorizacao`, `tokenValidado` e campos do fluxo de atendimento continuam no frontend como regra de negocio
- o proxy ainda aceita `SISCLINIC_API_TOKEN` como nome legado, mas o recomendado agora e `SISCLINIC_LOGIN_TOKEN`
