import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function PasswordWarningModal() {
  const navigate = useNavigate();
  const [pwdDaysLeft, setPwdDaysLeft] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const daysStr = localStorage.getItem('pwdDaysLeft');
    if (daysStr) {
      const days = parseInt(daysStr, 10);
      setPwdDaysLeft(days);
      
      if (days <= 7) {
        setShowModal(true);
      }
    }
  }, []);

  const handleClose = () => {
    if (pwdDaysLeft !== null && pwdDaysLeft > 3) {
      setShowModal(false);
      localStorage.removeItem('pwdDaysLeft'); 
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
              navigate('/profile'); 
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