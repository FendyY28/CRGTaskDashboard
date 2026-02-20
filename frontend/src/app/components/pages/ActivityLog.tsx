import { useEffect, useState } from "react";
import { History, User, Activity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns"; 
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { API_URL } from "../../../lib/utils"; // Pastikan path ini benar (sesuai perbaikan import tadi)

export function ActivityLog() { 
  const [logs, setLogs] = useState<any[]>([]); // Default array kosong
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); // Tambah state untuk handle error UI

  useEffect(() => {
    let isMounted = true; // Mencegah update state jika komponen sudah unmount

    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/audit`);
        
        // 1. Cek status HTTP (agar tidak lanjut jika 404/500)
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = await res.json();
        
        if (isMounted) {
          // 2. VALIDASI: Pastikan data benar-benar Array
          if (Array.isArray(data)) {
            setLogs(data);  
            setError(false);
          } else {
            console.warn("Data audit invalid (bukan array):", data);
            setLogs([]); 
            setError(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Gagal ambil log:", err);
          setError(true);
          setLogs([]); // Reset jadi array kosong biar .map gak error
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLogs(); // Load pertama
    const interval = setInterval(fetchLogs, 15000); // Auto-refresh 15 detik

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="h-full border-none shadow-sm ring-1 ring-gray-200 bg-white flex flex-col">
      <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/30">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#36A39D]/10 rounded-lg">
            <Activity className="h-4 w-4 text-[#36A39D]" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-gray-800">Activity Log</CardTitle>
            <p className="text-[10px] text-gray-500">Real-time system updates</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-[500px] overflow-y-auto p-4 space-y-6 custom-scrollbar"> 
          {loading ? (
            <p className="text-center text-xs text-gray-400 py-10 animate-pulse">Loading updates...</p>
          ) : error ? (
             <div className="text-center py-10">
               <div className="bg-red-50 text-red-500 p-2 rounded-full w-fit mx-auto mb-2">
                 <Activity className="h-4 w-4" />
               </div>
               <p className="text-xs text-red-400 font-medium">Failed to load activity.</p>
               <p className="text-[10px] text-gray-400 mt-1">Check backend connection.</p>
             </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <History className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No recent activity recorded.</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={log.id} className="flex gap-3 relative group">
                {/* Garis Vertikal */}
                {index !== logs.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-gray-100/80 group-hover:bg-[#36A39D]/20 transition-colors"></div>
                )}
                
                {/* Icon User */}
                <div className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 z-10 shadow-sm mt-0.5">
                  <User className="h-3 w-3 text-gray-500" />
                </div>

                {/* Konten Log */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-[11px] font-bold text-gray-900 truncate pr-2">
                      {log.user?.name || log.userName || "System"} 
                    </span>
                    <span className="text-[9px] text-gray-400 flex items-center gap-1 shrink-0 bg-gray-50 px-1.5 py-0.5 rounded-full">
                      <Clock className="h-2 w-2" />
                      {/* Safety check tanggal valid */}
                      {log.createdAt && !isNaN(new Date(log.createdAt).getTime()) 
                        ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) 
                        : "Unknown time"}
                    </span>
                  </div>
                  
                  {/* Action Badge */}
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#36A39D]/10 text-[#36A39D] mb-1.5 border border-[#36A39D]/10">
                    {log.action ? log.action.replace(/_/g, " ") : "UPDATE"}
                  </span>

                  {/* Detail Text */}
                  <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                    {log.details || "No details provided."}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}