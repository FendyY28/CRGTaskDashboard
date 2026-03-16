import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {api} from '../../services/api'; // Sesuaikan dengan path instance axios/api kamu

export default function ConfirmReset() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Link tidak valid atau token tidak ditemukan.');
      return;
    }

    const confirmReset = async () => {
      try {
        await api.post('/auth/confirm-admin-reset', { token });
        setStatus('success');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.message || 'Terjadi kesalahan saat memproses permintaan Anda.'
        );
      }
    };

    confirmReset();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Konfirmasi Reset Akun
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          
          {/* TAMPILAN LOADING */}
          {status === 'loading' && (
            <div className="animate-pulse">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-gray-600">Sedang memverifikasi dan membuat password baru...</p>
            </div>
          )}

          {/* TAMPILAN SUKSES */}
          {status === 'success' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Persetujuan Berhasil!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Sistem telah men-generate password baru untuk Anda. Silakan periksa <b>Kotak Masuk (Inbox)</b> email Anda dalam beberapa saat.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
              >
                Kembali ke Halaman Login
              </button>
            </div>
          )}

          {/* TAMPILAN ERROR */}
          {status === 'error' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Konfirmasi Gagal</h3>
              <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Kembali ke Beranda
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}