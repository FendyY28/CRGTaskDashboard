import { API_URL, getUserIdFromToken } from "../../lib/utils"; 

const getToken = () => localStorage.getItem("auth_token");

async function fetchWrapper(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401) {
      console.warn("Sesi berakhir (401 Unauthorized).");
    }
    let errorMessage = `Error server (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) return {}; 
  
  try {
    return await response.json();
  } catch (e) {
    return {};
  }
}

// 2. FUNGSI HELPER UNTUK INJEKSI USER ID OTOMATIS
const injectUserId = (body: any = {}) => {
  const userId = getUserIdFromToken();
  // Gabungkan data body asli dengan userId
  return { ...body, userId }; 
};

export const api = {
  get: (endpoint: string, options?: RequestInit) => 
    fetchWrapper(endpoint, { ...options, method: "GET" }),
    
  post: (endpoint: string, body: any = {}, options?: RequestInit) => 
    // Injeksi userId sebelum dikirim
    fetchWrapper(endpoint, { ...options, method: "POST", body: JSON.stringify(injectUserId(body)) }),
    
  patch: (endpoint: string, body: any = {}, options?: RequestInit) => 
    // Injeksi userId sebelum dikirim
    fetchWrapper(endpoint, { ...options, method: "PATCH", body: JSON.stringify(injectUserId(body)) }),
    
  delete: (endpoint: string, body: any = {}, options?: RequestInit) => 
    // Injeksi userId sebelum dikirim
    fetchWrapper(endpoint, { ...options, method: "DELETE", body: JSON.stringify(injectUserId(body)) }),
};