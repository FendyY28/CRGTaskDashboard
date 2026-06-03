import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function PasswordWarningModal() {
  const navigate = useNavigate();
  const [pwdDaysLeft, setPwdDaysLeft] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Ambil tanggal terakhir kali password diubah dari database/login
    const changedAtStr = localStorage.getItem('password_changed_at');
    
    if (changedAtStr) {
      const lastChanged = new Date(changedAtStr);
      
      // 2. Tambahkan 180 hari (Sama persis dengan rumus di halaman Profile)
      const expiryDate = new Date(lastChanged);
      expiryDate.setDate(expiryDate.getDate() + 180); 

      // 3. Hitung selisih hari dengan hari ini secara real-time
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const finalDays = diffDays > 0 ? diffDays : 0;
      setPwdDaysLeft(finalDays);
      
      // 4. Cek apakah user sudah menekan "Nanti Saja" di sesi browser ini
      const isSnoozed = sessionStorage.getItem('snooze_pwd_warning');
      
      // 5. Tampilkan modal hanya jika <= 7 hari DAN belum di-snooze
      if (finalDays <= 7 && !isSnoozed) {
        setShowModal(true);
      }
    }
  }, []);

  const handleClose = () => {
    if (pwdDaysLeft !== null && pwdDaysLeft > 3) {
      setShowModal(false);
      // Simpan ke sessionStorage agar tidak mengganggu user terus-menerus 
      // tiap kali dia pindah menu, tapi akan muncul lagi kalau dia tutup browser.
      sessionStorage.setItem('snooze_pwd_warning', 'true'); 
    }
  };

  if (!showModal || pwdDaysLeft === null) return null;

  const isCritical = pwdDaysLeft <= 3;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        
        <div className={`flex items-center gap-3 mb-4 ${isCritical ? 'text-red-600' : 'text-amber-500'}`}>
          <h2 className="text-xl font-bold">
            {isCritical ? 'Wajib Ganti Password' : 'Peringatan Keamanan'}
          </h2>
        </div>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          Masa berlaku password Anda akan habis dalam <b>{pwdDaysLeft} hari</b>. 
          {isCritical 
            ? " Anda diwajibkan untuk mengganti password sekarang agar dapat melanjutkan." 
            : " Kami menyarankan Anda untuk segera memperbarui password Anda."}
        </p>
        
        <div className="flex justify-end gap-3">
          {!isCritical && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Nanti Saja
            </button>
          )}

          <button
            onClick={() => {
              setShowModal(false);
              navigate('/settings/profile'); // <-- pastikan path navigasinya mengarah tepat ke profile settings
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            Ganti Password Sekarang
          </button>
        </div>

      </div>
    </div>
  );
}