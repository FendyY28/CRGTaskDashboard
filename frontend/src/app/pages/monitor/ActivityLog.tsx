import { memo } from "react";
import { History, User, Activity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns"; 
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useActivityLog } from "../../hooks/useActivityLog"; 

const LogItem = memo(({ log, isLast }: { log: any, isLast: boolean }) => (
  <div className="flex gap-3 relative group">
    {!isLast && (
      <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-gray-100/80 group-hover:bg-[#38A79C]/20 transition-colors"></div>
    )}
    
    <div className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 z-10 shadow-sm mt-0.5">
      <User className="h-3 w-3 text-gray-500" />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start mb-0.5">
        <span className="text-[11px] font-bold text-gray-900 truncate pr-2">
          {log.user?.name || log.userName || "System"} 
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1 shrink-0 bg-gray-50 px-1.5 py-0.5 rounded-full">
          <Clock className="h-2 w-2" />
          {log.createdAt && !isNaN(new Date(log.createdAt).getTime()) 
            ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) 
            : "Unknown time"}
        </span>
      </div>
      
      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#38A79C]/10 text-[#38A79C] mb-1.5 border border-[#38A79C]/10 uppercase tracking-wider">
        {log.action ? log.action.replace(/_/g, " ") : "UPDATE"}
      </span>

      <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
        {log.details || "No details provided."}
      </p>
    </div>
  </div>
));
LogItem.displayName = "LogItem";

export function ActivityLog() { 
  const { logs, loading, error } = useActivityLog(); 

  return (
    <Card className="h-full border-none shadow-sm ring-1 ring-gray-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#38A79C]/10 rounded-lg">
            <Activity className="h-4 w-4 text-[#38A79C]" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-gray-800">Activity Log</CardTitle>
            <p className="text-[10px] text-gray-500">Real-time system updates</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 relative overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto p-4 space-y-6 custom-scrollbar"> 
          {loading ? (
            <p className="text-center text-xs text-gray-400 py-10 animate-pulse">Loading updates...</p>
          ) : error ? (
             <div className="text-center py-10">
               <div className="bg-red-50 text-red-500 p-2 rounded-full w-fit mx-auto mb-2">
                 <Activity className="h-4 w-4" />
               </div>
               <p className="text-xs text-red-400 font-medium">Failed to load activity.</p>
             </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <History className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No recent activity recorded.</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <LogItem key={log.id} log={log} isLast={index === logs.length - 1} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}