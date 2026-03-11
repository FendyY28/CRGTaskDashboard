import { SDLC_PHASES, PROJECT_STATUS, THEME } from "../../../constants/projectConstants";

export const getToday = () => new Date().toISOString().split('T')[0];

export const toFormDate = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toISOString().split('T')[0];
};

export const calcDate = (d: string, n: number, t: 'D' | 'M') => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  t === 'D' ? date.setDate(date.getDate() + n) : date.setMonth(date.getMonth() + n);
  return date.toISOString().split('T')[0];
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case PROJECT_STATUS.ON_TRACK: return `text-[${THEME.TOSCA}]`;
    case PROJECT_STATUS.OVERDUE: return 'text-red-600'; 
    case PROJECT_STATUS.AT_RISK: return `text-[${THEME.BSI_YELLOW}]`;
    default: return 'text-gray-500';
  }
};

export const PHASES_ARRAY: string[] = Object.values(SDLC_PHASES);

export const STATUS_OPTIONS_ARRAY = [
  PROJECT_STATUS.PENDING, 
  PROJECT_STATUS.ON_TRACK, 
  PROJECT_STATUS.AT_RISK, 
  PROJECT_STATUS.OVERDUE
];

export const INITIAL_FORM_STATE = {
  name: "", pic: "", currentPhase: "", status: "", overallProgress: "0",
  projectStartDate: "", projectDeadline: "", phaseStartDate: "", phaseDeadline: "", phaseStatus: ""
};