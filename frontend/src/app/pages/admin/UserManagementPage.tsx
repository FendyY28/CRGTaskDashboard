import { useState, useEffect } from "react";
import { Plus, Users, Search, Filter } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useTranslation } from "react-i18next";
import { useUsers } from "../../hooks/useUsers"; 
import { UserTable } from "../../components/features/admin/UserTable";
import { AddUserModal, EditUserModal, ConfirmActionModal } from "../../components/modals/UserModals";

import { THEME } from "../../constants/projectConstants";

export function UserManagementPage() {
  const { t } = useTranslation();
  
  const { users, isLoading, fetchUsers, addUser, updateUser, deleteUser, resetPassword } = useUsers(); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL"); 
  
  // STATE UNTUK MODALS FORM
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // STATE UNTUK MODAL KONFIRMASI
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "DELETE" as "DELETE" | "RESET", 
    user: null as any
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 🔥 FILTER DAN SORTING
  const sortedAndFilteredUsers = users
    .filter(u => {
      // 1. Sembunyikan ADMIN
      if (u.role === "ADMIN") return false;

      // 2. Filter Dropdown Role
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      // 3. Filter Pencarian Text
      const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.email?.toLowerCase().includes(searchTerm.toLowerCase());
                            
      return matchesSearch;
    })
    .sort((a, b) => {
      // 🎯 PRIORITAS 1: Sortir berdasarkan Role (HEAD di atas OFFICER)
      const roleOrder = { "HEAD": 1, "OFFICER": 2 };
      const orderA = roleOrder[a.role as keyof typeof roleOrder] || 99;
      const orderB = roleOrder[b.role as keyof typeof roleOrder] || 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // 🎯 PRIORITAS 2: Sortir berdasarkan Tanggal Join (Paling Baru di Atas)
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const openConfirmModal = (type: "DELETE" | "RESET", user: any) => {
    setConfirmModal({ isOpen: true, type, user });
  };

  const handleConfirmAction = async () => {
    const userId = confirmModal.user?.id;
    if (!userId) return;

    if (confirmModal.type === "DELETE") {
      await deleteUser(userId);
    } else if (confirmModal.type === "RESET") {
      if (resetPassword) await resetPassword(userId); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Users style={{ color: THEME.TOSCA }} className="h-6 w-6" /> 
            {t('admin.userManagement.title', 'Manajemen Pengguna')}
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            {t('admin.userManagement.subtitle', 'Atur akses dan role untuk tim internal Anda.')}
          </p>
        </div>
        
        <Button 
          onClick={() => setIsAddOpen(true)} 
          style={{ backgroundColor: THEME.TOSCA }}
          className="text-white font-bold gap-2 rounded-xl shadow-md transition-all hover:scale-[1.02] hover:brightness-95 focus-visible:ring-0"
        >
          <Plus className="h-4 w-4" /> {t('admin.userManagement.addUserBtn', 'Tambah Pengguna')}
        </Button>
      </div>

      {/* TOOLBAR (SEARCH & FILTER) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder={t('admin.userManagement.searchPlaceholder', 'Cari nama atau email...')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-9 h-10 bg-gray-50/50 border-gray-100 focus-visible:bg-white focus-visible:ring-0 focus-visible:border-[${THEME.TOSCA}] rounded-xl transition-all`}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className={`h-10 w-full sm:w-[150px] bg-gray-50/50 border-gray-100 focus:ring-0 focus:border-[${THEME.TOSCA}] rounded-xl font-semibold text-gray-600`}>
              <SelectValue placeholder="Filter Role" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-100 shadow-xl rounded-xl">
              <SelectItem value="ALL" className="font-semibold cursor-pointer">Semua Role</SelectItem>
              <SelectItem value="HEAD" className="font-semibold cursor-pointer">HEAD</SelectItem>
              <SelectItem value="OFFICER" className="font-semibold cursor-pointer">OFFICER</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE */}
      <UserTable 
        users={sortedAndFilteredUsers} 
        isLoading={isLoading} 
        onEdit={handleEditClick}      
        onDelete={(user) => openConfirmModal("DELETE", user)}
        onResetPassword={(user) => openConfirmModal("RESET", user)}
      />

      <AddUserModal 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSubmitAction={addUser} 
      />

      <EditUserModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        userData={selectedUser}
        onSubmitAction={updateUser}
      />

      <ConfirmActionModal
        open={confirmModal.isOpen}
        onOpenChange={(isOpen) => setConfirmModal(prev => ({ ...prev, isOpen }))}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.type === "DELETE" ? t('admin.userManagement.confirm.deleteTitle', 'Hapus Pengguna?') : 
          t('admin.userManagement.confirm.resetTitle', 'Reset Password?')
        }
        description={
          confirmModal.type === "DELETE" 
            ? t('admin.userManagement.confirm.deleteDesc', `Apakah Anda yakin ingin menghapus permanen akun ${confirmModal.user?.name || ''}?`) 
            : t('admin.userManagement.confirm.resetDesc', `Password akun ${confirmModal.user?.name || ''} akan diubah menjadi default (Bsi12345!).`)
        }
        actionLabel={
          confirmModal.type === "DELETE" ? t('admin.userManagement.confirm.deleteBtn', 'Ya, Hapus') : 
          t('admin.userManagement.confirm.resetBtn', 'Ya, Reset')
        }
        variant={confirmModal.type === "DELETE" ? "danger" : "primary"}
      />
      
    </div>
  );
}