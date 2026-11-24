import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useApiResource } from './useApiResource';

const asUserList = (raw: unknown): any[] => (Array.isArray(raw) ? raw : []);

export const useUsers = () => {
  const { t } = useTranslation();
  const { data: users, loading: isLoading, reload: fetchUsers } = useApiResource<any[]>(
    '/users',
    [],
    t('admin.userManagement.errors.fetch', 'Gagal memuat data pengguna.'),
    asUserList,
  );

  // 1. AMBIL SEMUA USER (dilakukan otomatis oleh useApiResource)

  // 2. TAMBAH USER BARU (Password otomatis oleh Backend)
  const addUser = async (payload: any) => {
    await api.post('/users', payload);
    
    toast.success(t('admin.userManagement.success.add', 'User berhasil dibuat. Kredensial telah dikirim ke email mereka.'));
    await fetchUsers();
  };

  // 3. EDIT USER (Hanya Role)
  const updateUser = async (id: string, payload: any) => {
    // Backend harus divalidasi agar hanya menerima field 'role'
    await api.patch(`/users/${id}`, payload);
    
    toast.success(t('admin.userManagement.success.update', 'Hak akses pengguna berhasil diperbarui!'));
    await fetchUsers();
  };

  // 4. HAPUS USER
  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      
      toast.success(t('admin.userManagement.success.delete', 'Pengguna berhasil dihapus permanen!'));
      await fetchUsers();
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