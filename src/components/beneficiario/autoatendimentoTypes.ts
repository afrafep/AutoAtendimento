export interface ConsultaAutoAtendimento {
  idEvento: number;
  idProfissional: number | string;
  nomeEvento?: string | null;
  descricaoEvento?: string | null;
  dataInicio: string;
  horaInicio: string;
  dataFim?: string | null;
  horaFim?: string | null;
  categoria?: string | null;
  statusAgendamento: string;
  corEvento?: string | null;
  celularContato?: string | null;
  idProfissionalRealizaProcedimento?: number | null;
  retorno?: boolean;
  localAgendamento?: string | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
  usuarioCriacao?: string | null;
  usuarioUpdate?: string | null;
  prioridadePainel?: string | null;
  cdPaciente?: number | null;
  procedimentos?: any[];
  profissionalNome: string;
  especialidadeNome: string;
  pacienteNome: string;
  flSexo?: string | null;
  nuCpf: string;
  nrCarteiraPlano: string;
  autorizado: boolean;
  tokenValidado: boolean;
  senhaAutorizacao: string;
  numeroGuiaOperadora?: number | null;
  numeroGuiaGerado?: string | null;
  senhaPainel?: string | null;
  localidadePainel?: string | null;
  erroAutorizacao?: boolean;
  mensagemErroAutorizacao?: string;
}

export interface ConsultaCardAgrupado {
  chave: string;
  consultaBase: ConsultaAutoAtendimento;
  consultasRelacionadas: ConsultaAutoAtendimento[];
  agrupadoUltrassom: boolean;
}

export interface ConsultaFluxoItem {
  cardConsulta: ConsultaCardAgrupado;
  consulta: ConsultaAutoAtendimento;
  indice: number;
  etapaAtual: number;
  total: number;
  autorizado: boolean;
  tokenValidado: boolean;
  guiaGerada: boolean;
  senhaAutorizacaoPreenchida: boolean;
  tokenEnviado: boolean;
  autorizacaoConcluida: boolean;
}

export interface TokenErroModalState {
  idEvento: number;
  titulo: string;
  descricao: string;
}
