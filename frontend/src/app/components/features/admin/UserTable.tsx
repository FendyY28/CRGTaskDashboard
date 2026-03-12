import { Pencil, Trash2, Loader2, KeyRound, Users } from "lucide-react";
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
}

export function UserTable({ users, isLoading, onDelete, onEdit, onResetPassword }: UserTableProps) {
  const { t, i18n } = useTranslation();

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin mb-4" style={{ color: THEME.TOSCA }} />
        <p className="text-sm font-bold uppercase tracking-widest text-gray-400 animate-pulse">
          {t('admin.userManagement.loading', 'Loading Data...')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[300px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          {/* TABLE HEADER */}
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">{t('admin.userManagement.table.name')}</th>
              <th className="px-6 py-4">{t('admin.userManagement.table.role')}</th>
              <th className="px-6 py-4">{t('admin.userManagement.table.joined')}</th>
              <th className="px-6 py-4 text-center">{t('admin.userManagement.table.actions')}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  
                  {/* KOLOM NAMA & EMAIL */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ backgroundColor: `${THEME.TOSCA}1A`, color: THEME.TOSCA }}
                      >
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          {user.name}
                          {isNewUser(user.createdAt) && (
                            <Badge className="h-4 text-[9px] px-1.5 bg-green-100 text-green-700 border-none shadow-none font-bold">
                              {t('admin.userManagement.badge.new', 'NEW')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 lowercase">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* KOLOM ROLE */}
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>

                  {/* KOLOM TANGGAL GABUNG */}
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {formatDate(user.createdAt, i18n.language)}
                  </td>
                  
                  {/* KOLOM AKSI (LOCALIZED TOOLTIPS) */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      
                      {/* EDIT */}
                      <button 
                        onClick={() => onEdit?.(user)} 
                        title={t('admin.actions.edit')} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all outline-none"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* RESET PASSWORD */}
                      <button 
                        onClick={() => onResetPassword?.(user)} 
                        title={t('admin.actions.resetPwd')} 
                        className="p-2 text-gray-400 rounded-lg transition-all outline-none"
                        style={{ '--hover-bg': `${THEME.TOSCA}1A`, '--hover-text': THEME.TOSCA } as any}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${THEME.TOSCA}1A`;
                          e.currentTarget.style.color = THEME.TOSCA;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '';
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>

                      {/* DELETE */}
                      <button 
                        onClick={() => onDelete?.(user)} 
                        title={t('admin.actions.delete')} 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all outline-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            ) : (
              /* EMPTY STATE (LOCALIZED) */
              <tr>
                <td colSpan={4} className="text-center py-24 text-gray-400 italic bg-gray-50/20">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 opacity-10" />
                    {t('admin.userManagement.table.noData', 'No user data found.')}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}