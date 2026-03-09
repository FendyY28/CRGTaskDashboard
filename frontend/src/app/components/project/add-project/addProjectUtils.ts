export const getToday = () => new Date().toISOString().split('T')[0];

export const calcDate = (date: string, amt: number, type: 'D' | 'M') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  type === 'M' ? d.setMonth(d.getMonth() + amt) : d.setDate(d.getDate() + amt);
  return d.toISOString().split('T')[0];
};

export const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupEmail = localStorage.getItem('user_email');
    const backupName = localStorage.getItem('user_name');

    if (!token || token === "mock-jwt-token") {
      console.warn("⚠️ Token asli tidak ditemukan. Menggunakan email/nama sebagai identitas.");
      return backupEmail || backupName || null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return backupEmail || backupName || null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    return parsed.id || parsed.sub || parsed.userId || parsed.email || backupEmail; 
  } catch (e) {
    return localStorage.getItem('user_email') || null;
  }
};

export const INITIAL_FORM = {
  name: "", code: "", pic: "", currentPhase: "Requirement", status: "on-track", overallProgress: "0",
  startDate: getToday(), deadline: calcDate(getToday(), 2, 'M'),
  phaseStartDate: getToday(), phaseDeadline: calcDate(getToday(), 7, 'D')
};

export const PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];