import { useState, useEffect } from "react";
import { api } from "../services/api"; 

export const useActivityLog = (refreshInterval = 15000) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const data = await api.get('/audit');
        
        if (isMounted) {
          if (Array.isArray(data)) {
            setLogs(data);  
            setError(false);
          } else {
            setLogs([]); 
            setError(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLogs([]); 
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLogs(); 
    const interval = setInterval(fetchLogs, refreshInterval); 

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);

  return { logs, loading, error };
};