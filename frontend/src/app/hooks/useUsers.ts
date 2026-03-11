import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper untuk mendapatkan token terbaru dari LocalStorage
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  });

  // 1. AMBIL SEMUA USER
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Gagal memuat data pengguna');
      
      const data = await res.json();
      setUsers(data);
    } catch (error: any) {
      toast.error(t('admin.userManagement.errors.fetch', 'Gagal memuat data pengguna.'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 2. TAMBAH USER BARU
  const addUser = async (payload: any) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menambahkan user');
    
    toast.success('Pengguna berhasil ditambahkan!');
    fetchUsers();
  };

  // 3. EDIT USER
  const updateUser = async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengupdate user');
    
    toast.success('Profil pengguna berhasil diperbarui!');
    fetchUsers();
  };

  // 4. HAPUS USER
  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal menghapus user');
      }
      
      toast.success('Pengguna berhasil dihapus permanen!');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // 5. RESET PASSWORD KE DEFAULT (Oleh Admin)
  const resetPassword = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}/reset-password`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal reset password');
      }
      
      toast.success('Password berhasil direset ke default!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // 6. SUSPEND USER (Nonaktifkan Akun)
  const suspendUser = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}/suspend`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal suspend user');
      }
      
      toast.success('Akun pengguna berhasil dinonaktifkan!');
      fetchUsers();
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
    resetPassword, 
    suspendUser 
  };
};