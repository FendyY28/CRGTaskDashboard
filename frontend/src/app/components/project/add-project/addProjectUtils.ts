export const getToday = () => new Date().toISOString().split('T')[0];

export const calcDate = (date: string, amt: number, type: 'D' | 'M') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  type === 'M' ? d.setMonth(d.getMonth() + amt) : d.setDate(d.getDate() + amt);
  return d.toISOString().split('T')[0];
};

export const INITIAL_FORM = {
  name: "", code: "", pic: "", currentPhase: "Requirement", status: "on-track", overallProgress: "0",
  startDate: getToday(), deadline: calcDate(getToday(), 2, 'M'),
  phaseStartDate: getToday(), phaseDeadline: calcDate(getToday(), 7, 'D')
};

export const PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];