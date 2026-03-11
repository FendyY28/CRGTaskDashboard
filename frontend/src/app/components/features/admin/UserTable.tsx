  import { Pencil, Trash2, Loader2, KeyRound } from "lucide-react";
  import { Badge } from "../../ui/badge";
  import { useTranslation } from "react-i18next";
  import { formatDate, isNewUser, RoleBadge } from "./userUtils";
  import { THEME } from "../../../constants/projectConstants"; 

  interface UserTableProps {
    users: any[];
    isLoading: boolean;
    onDelete?: (user: any) => void;
    onEdit?: (user: any) => void;
    onResetPassword?: (user: any) => void;
    onSuspend?: (user: any) => void;
  }

  export function UserTable({ users, isLoading, onDelete, onEdit, onResetPassword, onSuspend }: UserTableProps) {
    const { t, i18n } = useTranslation();

    if (isLoading) {
      return (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col items-center justify-center text-[${THEME.TOSCA}]`}>
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Data...</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">User Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Date Joined</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length > 0 ? users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  {/* KOLOM NAMA */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full bg-[${THEME.TOSCA}]/10 text-[${THEME.TOSCA}] flex items-center justify-center font-bold text-xs shrink-0`}>
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          {user.name}
                          {isNewUser(user.createdAt) && <Badge className="h-4 text-[9px] px-1.5 bg-green-100 text-green-700 border-none shadow-none">NEW</Badge>}
                        </div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{formatDate(user.createdAt, i18n.language)}</td>
                  
                  {/* KOLOM AKSI */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit?.(user)} title="Edit Profile" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all outline-none">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => onResetPassword?.(user)} title="Reset Password" className={`p-2 text-gray-400 hover:text-[${THEME.TOSCA}] hover:bg-[${THEME.TOSCA}]/10 rounded-lg transition-all outline-none`}>
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete?.(user)} title="Delete Permanently" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all outline-none">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-20 text-gray-400 italic bg-gray-50/30">No data found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }