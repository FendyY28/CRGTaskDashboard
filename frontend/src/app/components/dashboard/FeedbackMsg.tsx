import { CheckCircle2, AlertCircle } from "lucide-react";

export interface FeedbackMsgProps {
  status: { type: 'success' | 'error' | string; text: string };
}

export const FeedbackMsg = ({ status }: FeedbackMsgProps) => (
  <div className={`text-xs font-bold p-3 rounded-xl border flex items-center gap-2 animate-in fade-in ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
    {status.type === 'success' ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>} {status.text}
  </div>
);