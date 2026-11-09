import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

export const useUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. AMBIL SEMUA USER
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(t('admin.userManagement.errors.fetch', 'Gagal memuat data pengguna.'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 2. TAMBAH USER BARU (Password otomatis oleh Backend)
  const addUser = async (payload: any) => {
    await api.post('/users', payload);
    
    toast.success(t('admin.userManagement.success.add', 'User berhasil dibuat. Kredensial telah dikirim ke email mereka.'));
    fetchUsers();
  };

  // 3. EDIT USER (Hanya Role)
  const updateUser = async (id: string, payload: any) => {
    // Backend harus divalidasi agar hanya menerima field 'role'
    await api.patch(`/users/${id}`, payload);
    
    toast.success(t('admin.userManagement.success.update', 'Hak akses pengguna berhasil diperbarui!'));
    fetchUsers();
  };

  // 4. HAPUS USER
  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      
      toast.success(t('admin.userManagement.success.delete', 'Pengguna berhasil dihapus permanen!'));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // 5. RESET PASSWORD (Random generated & dikirim via Email)
  const resetPassword = async (id: string) => {
  try {
    await api.patch(`/auth/${id}/admin-reset-password`);
    
    toast.success(t('admin.userManagement.success.reset'));
  } catch (error: any) {
    toast.error(error.message);
  }
};

  return { 
    users, 
    isLoading, 
    fetchUsers, 
    addUser, 
    updateUser, 
    deleteUser, 
    resetPassword
  };
};