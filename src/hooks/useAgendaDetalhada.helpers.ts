import { api } from "../config/configApi";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const mapearSexoPACS = (sexo: string) => {
  if (!sexo) return "O";

  const sexoMaiusculo = sexo.toUpperCase();
  switch (sexoMaiusculo) {
    case "M":
    case "MASCULINO":
      return "M";
    case "F":
    case "FEMININO":
      return "F";
    default:
      return "O";
  }
};

const formatPatientBirthDate = (yyyy_mm_dd?: string) => {
  if (!yyyy_mm_dd) return "";
  const only = yyyy_mm_dd.replace(/-/g, "");
  if (!/^\d{8}$/.test(only)) {
    console.warn("[LOGIC PACS] patientBirthDate invalido:", yyyy_mm_dd);
  }
  return only;
};

const formatStepStartDateUTC = (dataISO: string, horaHHmm: string) => {
  const safeHora = /^\d{2}:\d{2}$/.test(horaHHmm)
    ? `${horaHHmm}:00`
    : horaHHmm || "00:00:00";
  const local = dayjs.tz(`${dataISO}T${safeHora}`, "America/Fortaleza");
  return local.utc().format("YYYY-MM-DD[T]HH:mm:ss.SSSZZ");
};

const getProcFromEvento = (procedimentos: any[], especialidade: any) => {
  if (procedimentos && procedimentos.length > 0) {
    return {
      desc: procedimentos[0]?.nmProcedimento || "",
      id: String(procedimentos[0]?.cdProcedimento || ""),
    };
  }
  return {
    desc: especialidade?.dsEspecialidade || "",
    id: String(especialidade?.idEspecialidade || ""),
  };
};

export const buildReferringCouncil = (profissional: any, ufFallback = "PB") => {
  const conselhoBase = String(
    profissional?.cdConselho || profissional?.conselho || "CRM",
  )
    .trim()
    .toUpperCase();
  const uf = String(profissional?.ufConselho || ufFallback || "")
    .trim()
    .toUpperCase();
  const numero = String(
    profissional?.crmNumero || profissional?.idProfissional || "",
  )
    .trim()
    .replace(/\s+/g, "");

  const council =
    conselhoBase && uf && numero ? `${conselhoBase}${uf}${numero}` : "";

  if (!council) {
    console.warn(
      "[LOGIC PACS] referringPhysicianCouncil ausente. Informe CRM/UF reais do médico.",
    );
  }

  return council;
};

export const extrairSolicitanteParaLogicMed = (
  eventoCompleto: any,
  profissionalFallback: any,
) => {
  const solicitante = eventoCompleto?.profissionalSolicitante;
  const conselhoSolicitante =
    solicitante?.conselhoProfSolicitante?.sigla ||
    solicitante?.conselhoProfSolicitante?.codigo ||
    (typeof eventoCompleto?.conselhoProfSolicitante === "object"
      ? eventoCompleto?.conselhoProfSolicitante?.sigla ||
        eventoCompleto?.conselhoProfSolicitante?.codigo
      : eventoCompleto?.conselhoProfSolicitante) ||
    "CRM";
  const ufSolicitante =
    solicitante?.ufConselhoProfSolicitante?.sigla ||
    (typeof eventoCompleto?.ufConselhoProfSolicitante === "object"
      ? eventoCompleto?.ufConselhoProfSolicitante?.sigla
      : eventoCompleto?.ufConselhoProfSolicitante) ||
    profissionalFallback?.ufConselho ||
    "PB";
  const numeroConselhoSolicitante =
    solicitante?.nrConselhoProfSolicitante ||
    eventoCompleto?.nrConselhoProfSolicitante ||
    profissionalFallback?.crmNumero ||
    profissionalFallback?.nrConselho ||
    profissionalFallback?.idProfissional ||
    "";
  const nomeSolicitante =
    solicitante?.nomeProfissionalSolicitante ||
    profissionalFallback?.nmProfissional ||
    "";

  return {
    nomeSolicitante,
    conselhoSolicitante,
    profissionalParaCouncil: {
      ufConselho: ufSolicitante,
      crmNumero: numeroConselhoSolicitante,
      idProfissional: numeroConselhoSolicitante,
      cdConselho: conselhoSolicitante,
    },
  };
};

export const extrairSolicitanteParaAutorizacao = (
  evento: any,
  profissionalExecutante: any,
) => {
  const solicitanteEvento = evento.profissionalSolicitante;

  const conselhoSolicitante =
    solicitanteEvento?.conselhoProfSolicitante?.codigo ||
    solicitanteEvento?.conselhoProfSolicitante?.sigla ||
    (typeof evento.conselhoProfSolicitante === "object"
      ? evento.conselhoProfSolicitante?.codigo ||
        evento.conselhoProfSolicitante?.sigla
      : evento.conselhoProfSolicitante) ||
    profissionalExecutante.cdConselho;

  const numeroConselhoSolicitante =
    solicitanteEvento?.nrConselhoProfSolicitante ||
    evento.nrConselhoProfSolicitante ||
    profissionalExecutante.nrConselho;

  const ufSolicitante =
    solicitanteEvento?.ufConselhoProfSolicitante?.codigo ||
    solicitanteEvento?.ufConselhoProfSolicitante?.sigla ||
    (typeof evento.ufConselhoProfSolicitante === "object"
      ? evento.ufConselhoProfSolicitante?.codigo ||
        evento.ufConselhoProfSolicitante?.sigla
      : evento.ufConselhoProfSolicitante) ||
    profissionalExecutante.ufConselho;

  return {
    nomeSolicitante: solicitanteEvento?.nomeProfissionalSolicitante || "",
    conselhoSolicitante,
    numeroConselhoSolicitante,
    ufSolicitante,
    cbosSolicitante: solicitanteEvento?.cbosSolicitante || "",
  };
};

export const extrairValorConselhoExecutante = (conselho: any) => {
  if (!conselho) return "";
  if (typeof conselho === "object") {
    return conselho.codigo || conselho.sigla || "";
  }
  return conselho;
};

export const extrairUfExecutante = (uf: any) => {
  if (!uf) return "";
  if (typeof uf === "object") {
    return uf.codigo || uf.sigla || "";
  }
  return uf;
};

const mapModality = (procDesc: string) => {
  const d = (procDesc || "").toUpperCase();

  if (d.includes("ULTRA") || d.startsWith("US") || d.includes("ULTRASSOM"))
    return "US";
  if (
    d.includes("DOPPLER") ||
    d.includes("DOPLER") ||
    d.includes("DROPPLER") ||
    d.includes("ECODOPPLERCARDIOGRAMA TRANSTORÁCICO") ||
    d.includes("ECODOPPLERCARDIOGRAMA TRANSTORACICO")
  )
    return "US";
  if (
    d.includes("RAIO X") ||
    d.includes("RX") ||
    d === "CR" ||
    d.includes("RADIOGRAFIA")
  )
    return "CR";
  if (d.includes("TOMOGRA") || d === "CT" || d.includes("TOMOGRAFIA"))
    return "CT";
  if (d.includes("RESSON") || d === "MR" || d.includes("RESSONANCIA"))
    return "MR";
  if (d.includes("MAMO") || d === "MG" || d.includes("MAMOGRAFIA")) return "MG";
  if (d.includes("ENDOSCOPIA") || d.includes("ENDO") || d === "ES") return "ES";
  if (d.includes("COLONOSCOPIA") || d.includes("COLONO") || d.trim() === "COLO")
    return "COLO";
  if (d.includes("HOLTER") || d === "HOL") return "HOL";
  if (d.includes("M.A.P.A") || d.includes("MAPA") || d === "MAP") return "MAP";
  if (d.includes("ECOCARDIOGRAMA") || d.includes("ECO") || d === "ECG")
    return "ECG";
  if (
    d.includes("ECODOPPLERCARDIOGRAMATRANSTORACICO") ||
    d.includes("ECGT") ||
    d === "US"
  )
    return "US";
  if (d.includes("ELETROCARDIOGRAMA") || d.includes("ELETRO") || d === "OT")
    return "OT";

  return "US";
};

const buscarDadosProfissionalReal = async (idProfissional: string | number) => {
  try {
    const response = await api.get(`/sisclinic/profissionais/${idProfissional}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do profissional real:", error);
    return null;
  }
};

export const buildLogicWorklistBody = async (
  eventoCompleto: any,
  procedimentoIndex: number = 0,
) => {
  const paciente = eventoCompleto?.paciente || {};
  const profissionalAgenda = eventoCompleto?.profissional || {};
  const esp = profissionalAgenda?.especialidade || {};
  const procedimentos = eventoCompleto?.procedimentos || [];

  let profissionalReal = profissionalAgenda;

  if (eventoCompleto.idProfissionalRealizaProcedimento) {
    const dadosProfissionalReal = await buscarDadosProfissionalReal(
      eventoCompleto.idProfissionalRealizaProcedimento,
    );

    if (dadosProfissionalReal) {
      profissionalReal = {
        idProfissional: dadosProfissionalReal.idProfissional,
        nmProfissional: dadosProfissionalReal.nmProfissional,
        especialidade: dadosProfissionalReal.especialidade,
        ufConselho: dadosProfissionalReal.ufConselho,
        crmNumero: dadosProfissionalReal.nrConselho,
        cdConselho: dadosProfissionalReal.cdConselho,
      };
    }
  }

  const cpfLimpo = String(paciente?.nuCpf || eventoCompleto?.nuCpf || "")
    .replace(/\D/g, "")
    .trim();
  const indiceSequencial = procedimentoIndex + 1;
  const idEventoLimpo = String(eventoCompleto?.idEvento || "")
    .replace(/\D/g, "")
    .trim();
  const accessionNumberUnico =
    idEventoLimpo ||
    `${String(cpfLimpo || "").replace(/\D/g, "")}-${indiceSequencial}`;

  if (procedimentos.length === 0) {
    const proc = getProcFromEvento(procedimentos, esp);
    const solicitanteLogic = extrairSolicitanteParaLogicMed(
      eventoCompleto,
      profissionalReal,
    );
    const comentarioProcedimento = [
      eventoCompleto?.descricaoEvento || "",
      proc.desc || esp?.dsEspecialidade || "",
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      patientBirthDate: formatPatientBirthDate(paciente?.dtNascimento),
      patientComments: comentarioProcedimento,
      issuerOfPatientID: "CLINICA",
      patientID: String(cpfLimpo || "SEM_ID"),
      patientName:
        paciente?.nmPaciente?.replace(/\s-\s\[\d+\]\s-\s\d+\sanos/, "").trim() ||
        eventoCompleto?.nomeEvento
          ?.replace(/\s-\s\[\d+\]\s-\s\d+\sanos/, "")
          .trim() ||
        "PACIENTE SEM NOME",
      patientSex: mapearSexoPACS(paciente?.flSexo),
      patientCpf: cpfLimpo,
      patientSize: "",
      patientWeight: "",
      accessionNumber: accessionNumberUnico,
      referringPhysicianCouncil: buildReferringCouncil(
        solicitanteLogic.profissionalParaCouncil,
        paciente?.nmUfEndereco || "PB",
      ),
      referringPhysicianName: solicitanteLogic.nomeSolicitante || "",
      requestedProcedureDescription: proc.desc || esp?.dsEspecialidade || "",
      modality: mapModality(proc.desc || esp?.dsEspecialidade || ""),
      requestedProcedureID: String(proc.id || idEventoLimpo || "0"),
      scheduledProcedureStepDescription:
        proc.desc || esp?.dsEspecialidade || "",
      scheduledProcedureStepStartDate: formatStepStartDateUTC(
        eventoCompleto?.dataInicio,
        eventoCompleto?.horaInicio,
      ),
      insurancePlanID: "AFRAFEP",
    };
  }

  const proc = procedimentos[procedimentoIndex] || procedimentos[0];
  const solicitanteLogic = extrairSolicitanteParaLogicMed(
    eventoCompleto,
    profissionalReal,
  );
  const comentarioProcedimento = [
    eventoCompleto?.descricaoEvento || "",
    proc.nmProcedimento || esp?.dsEspecialidade || "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    patientBirthDate: formatPatientBirthDate(paciente?.dtNascimento),
    patientComments: comentarioProcedimento,
    issuerOfPatientID: "CLINICA",
    patientID: String(cpfLimpo || "SEM_ID"),
    patientName:
      paciente?.nmPaciente?.replace(/\s-\s\[\d+\]\s-\s\d+\sanos/, "").trim() ||
      eventoCompleto?.nomeEvento
        ?.replace(/\s-\s\[\d+\]\s-\s\d+\sanos/, "")
        .trim() ||
      "PACIENTE SEM NOME",
    patientSex: mapearSexoPACS(paciente?.flSexo),
    patientCpf: cpfLimpo,
    patientSize: "",
    patientWeight: "",
    accessionNumber: accessionNumberUnico,
    referringPhysicianCouncil: buildReferringCouncil(
      solicitanteLogic.profissionalParaCouncil,
      paciente?.nmUfEndereco || "PB",
    ),
    referringPhysicianName: solicitanteLogic.nomeSolicitante || "",
    requestedProcedureDescription: proc.nmProcedimento || esp?.dsEspecialidade || "",
    modality: mapModality(proc.nmProcedimento || esp?.dsEspecialidade || ""),
    requestedProcedureID: String(
      proc.cdProcedimento || idEventoLimpo || "0",
    ),
    scheduledProcedureStepDescription:
      proc.nmProcedimento || esp?.dsEspecialidade || "",
    scheduledProcedureStepStartDate: formatStepStartDateUTC(
      eventoCompleto?.dataInicio,
      eventoCompleto?.horaInicio,
    ),
    insurancePlanID: "AFRAFEP",
  };
};

