import axios from "axios";

export interface InteliteTipoAtendimento {
  id: string;
  tipoAtendimento: string;
  corBg: string;
  corTexto: string;
  prefixo: string;
}

export interface InteliteSenha {
  criacao?: string;
  data_senha?: string;
  horaChamada?: string;
  horaChamadaRecepcao?: string;
  corBg?: string;
  corTexto?: string;
  tipoAtendimento?: string;
  idTipoAtendimento?: string;
  prefixo?: string;
  status?: string;
  senha: string;
  atendente?: string;
  nomePaciente?: string;
  localNome?: string;
  localNumero?: string;
}

export interface InteliteSenhaEmitida {
  tipoAtendimento?: string;
  senhaEmitida: string;
  urlAcompanhamento?: string;
}

export interface IntelitePainel {
  id: string;
  nome: string;
}

export interface InteliteUsuarioResponse {
  idUsuario: string;
  nomeUsuario: string;
  idTipoAtendimento: string;
  nomeTipoAtendimento: string;
}

const baseURL = "/api/intelite";
const quantidadePadrao = 10;

const inteliteApi = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const post = async <TResponse, TPayload extends Record<string, unknown>>(
  endpoint: string,
  payload?: TPayload
) => {
  const { data } = await inteliteApi.post<TResponse>(endpoint, payload || {});
  return data;
};

export const inteliteSenhaConfig = {
  baseURL,
  quantidadePadrao,
};

export const inteliteSenhaService = {
  buscarTiposAtendimento: () =>
    post<InteliteTipoAtendimento[], Record<string, never>>(
      "/buscarTiposAtendimento"
    ),

  emitirSenha: (payload: {
    idTipoAtendimento: string;
    nomePaciente?: string;
    telefone?: string;
    email?: string;
    codigo?: string;
  }) => post<InteliteSenhaEmitida, typeof payload>("/emitirSenha", payload),

  buscarSenha: (senha: string) =>
    post<InteliteSenha, { senha: string }>("/buscarSenha", { senha }),

  buscarSenhaRecepcao: (senha: string) =>
    post<InteliteSenha, { senha: string }>("/buscarSenhaRecepcao", { senha }),

  buscarSenhas: () =>
    post<InteliteSenha[], Record<string, never>>("/buscarSenhas"),

  buscarSenhasRecepcao: () =>
    post<InteliteSenha[], Record<string, never>>("/buscarSenhasRecepcao"),

  ultimasSenhasChamadas: (quantidade = quantidadePadrao) =>
    post<InteliteSenha[], { quantidade: number }>("/ultimasSenhasChamadas", {
      quantidade,
    }),

  ultimasSenhasChamadasRecepcao: (quantidade = quantidadePadrao) =>
    post<InteliteSenha[], { quantidade: number }>(
      "/ultimasSenhasChamadasRecepcao",
      { quantidade }
    ),

  emAtendimentoRecepcao: (quantidade = quantidadePadrao) =>
    post<InteliteSenha[], { quantidade: number }>("/emAtendimentoRecepcao", {
      quantidade,
    }),

  buscarPaineis: () =>
    post<IntelitePainel[], Record<string, never>>("/buscarPaineis"),

  chamarSenhaRecepcao: (payload: {
    senha: string;
    local: string;
    numeroLocal: string;
    nomeProfissional: string;
    idProfissional: string;
  }) => post<{ resposta: string }, typeof payload>("/chamarSenhaRecepcao", payload),

  chamarSenha: (payload: {
    senha: string;
    local: string;
    numeroLocal: string;
    nomeProfissional: string;
    idProfissional: string;
    nomePaciente: string;
  }) => post<{ resposta: string }, typeof payload>("/chamarSenha", payload),

  finalizarSenha: (senha: string) =>
    post<{ resposta: string }, { senha: string }>("/finalizarSenha", {
      senha: senha.trim().toUpperCase(),
    }),

  encaminharSenha: (payload: {
    idTipoAtendimento: string;
    senha: string;
    local: string;
    numeroLocal: string;
    nomeProfissional: string;
    idProfissional: string;
    nomePaciente: string;
  }) => post<{ resposta: string }, typeof payload>("/encaminharSenha", payload),

  novoUsuario: (payload: {
    local: string;
    numeroLocal: string;
    idProfissional: string;
    nomeProfissional: string;
    listaPaineisIds: string[];
  }) => post<InteliteUsuarioResponse, typeof payload>("/novoUsuario", payload),

  editarUsuario: (payload: {
    local: string;
    numeroLocal: string;
    idProfissional: string;
    nomeProfissional: string;
    listaPaineisIds: string[];
  }) => post<InteliteUsuarioResponse, typeof payload>("/editarUsuario", payload),
};

