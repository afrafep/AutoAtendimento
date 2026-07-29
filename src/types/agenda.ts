export interface ProcedimentoAgenda {
  cdProcedimento: string | number;
  nmProcedimento: string;
  quantidadeProcedimento?: number;
}

export interface PacienteAgenda {
  nmPaciente: string;
  dtNascimento: string;
  nuCpf: string;
  cdPaciente?: number;
  nrCarteiraPlano?: string;
  flSexo?: string;
  nmUfEndereco?: string;
}

export interface ConselhoAgenda {
  codigo?: string;
  descricao?: string;
  sigla?: string;
}

export interface UfConselhoAgenda {
  codigo?: number | string;
  sigla?: string;
  nome?: string;
}

export interface ProfissionalSolicitanteAgenda {
  id?: number | string;
  nomeProfissionalSolicitante: string;
  nrConselhoProfSolicitante?: string;
  conselhoProfSolicitante?: ConselhoAgenda | null;
  ufConselhoProfSolicitante?: UfConselhoAgenda | null;
  cbosSolicitante?: string;
}

export interface ProfissionalAgenda {
  idProfissional?: number | string;
  nmProfissional: string;
  especialidade: {
    dsEspecialidade: string;
    idEspecialidade?: number;
  };
  ufConselho?: string;
  crmNumero?: string;
}

export interface AgendaEvento {
  idEvento: number;
  horaInicio: string;
  horaFim: string;
  descricaoEvento: string;
  categoria: string;
  nomeEvento: string;
  corEvento?: string;
  statusEmoji?: any;
  paciente: PacienteAgenda | null;
  profissional: ProfissionalAgenda;
  celularContato: string;
  cipn?: string;
  statusAgendamento: string;
  dataInicio?: string;
  nuCpf?: string;
  local?: string;
  localAgendamento?: string | null;
  autorizado?: boolean;
  retorno?: boolean;
  tokenValidado?: boolean;
  senhaAutorizacao?: string | null;
  senhaPainel?: string | null;
  prioridadePainel?: string | null;
  localidadePainel?: string | null;
  numeroGuiaGerado?: string | null;
  numeroGuiaOperadora?: number | null;
  procedimentos: ProcedimentoAgenda[];
  idProfissionalRealizaProcedimento?: number | string;
  nrConselhoProfSolicitante?: string;
  conselhoProfSolicitante?: ConselhoAgenda | string | null;
  ufConselhoProfSolicitante?: UfConselhoAgenda | string | number | null;
  profissionalSolicitante?: ProfissionalSolicitanteAgenda | null;
}

export interface UseAgendaDetalhadaProps {
  location: any;
  navigate: any;
}

export interface DadosGuiaAutorizacao {
  numeroGuiaGerado: string;
  numeroGuiaOperadora: number;
}
