import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/button';
import { THEME } from '../../constants/projectConstants';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const DAYS_ROTATION_POLICY = 180; // Kebijakan rotasi password (180 hari)
const WARNING_THRESHOLD_DAYS = 7; // Mulai muncul pop-up peringatan jika sisa <= 7 hari (minggu terakhir)
const CRITICAL_THRESHOLD_DAYS = 3; // Menjadi sangat mendesak / merah jika sisa <= 3 hari

export function PasswordWarningModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const [pwdDaysLeft, setPwdDaysLeft] = useState<number | null>(null);
  const [expiryDateFormatted, setExpiryDateFormatted] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Jangan tampilkan modal jika user sudah berada di halaman profile settings
    if (location.pathname === '/settings/profile') {
      setShowModal(false);
      return;
    }

    const evaluateExpiry = (changedAtStr: string) => {
      const lastChanged = new Date(changedAtStr);
      const expiryDate = new Date(lastChanged);
      expiryDate.setDate(expiryDate.getDate() + DAYS_ROTATION_POLICY);

      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const finalDays = diffDays > 0 ? diffDays : 0;
      
      setPwdDaysLeft(finalDays);
      setExpiryDateFormatted(
        expiryDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );

      // Tampilkan modal jika sisa hari <= threshold peringatan pada setiap navigasi halaman
      if (finalDays <= WARNING_THRESHOLD_DAYS) {
        setShowModal(true);
      }
    };

    const changedAtStr = localStorage.getItem('password_changed_at');
    if (changedAtStr) {
      evaluateExpiry(changedAtStr);
    } else {
      // Jika di localStorage belum ada, ambil tanggal asli dari DB via /auth/me
      api.get('/auth/me')
        .then((user: any) => {
          if (user?.passwordChangedAt) {
            localStorage.setItem('password_changed_at', user.passwordChangedAt);
            evaluateExpiry(user.passwordChangedAt);
          }
        })
        .catch(() => {});
    }
  }, [location.pathname, i18n.language]);

  const handleDismiss = () => {
    // Menutup modal di halaman saat ini saja (akan muncul lagi saat berpindah halaman)
    setShowModal(false);
  };

  const handleGoToSettings = () => {
    setShowModal(false);
    navigate('/settings/profile');
  };

  if (!showModal || pwdDaysLeft === null) return null;

  const isCritical = pwdDaysLeft <= CRITICAL_THRESHOLD_DAYS;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-center border border-gray-100 relative animate-in zoom-in-95 duration-300">
        
        {/* Tombol Close jika non-critical */}
        {!isCritical && (
          <button 
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            title={t('passwordModal.dismiss', 'Tutup')}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Icon dengan Ring Glow */}
        <div className={`mx-auto mb-5 h-16 w-16 rounded-2xl flex items-center justify-center ring-8 transition-all ${
          isCritical 
            ? 'bg-red-500 text-white ring-red-100 shadow-lg shadow-red-200 animate-pulse' 
            : 'bg-amber-500 text-white ring-amber-100 shadow-lg shadow-amber-200'
        }`}>
          {isCritical ? <ShieldAlert className="h-8 w-8" /> : <KeyRound className="h-8 w-8" />}
        </div>

        {/* Judul Modal */}
        <h3 className={`text-xl font-black mb-2 ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>
          {isCritical 
            ? t('passwordModal.criticalTitle', 'Wajib Ganti Password!')
            : t('passwordModal.warningTitle', 'Pengingat Masa Berlaku Password')}
        </h3>

        {/* Badge Countdown */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold my-2 ${
          isCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          <AlertTriangle className={`h-3.5 w-3.5 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
          <span>
            {pwdDaysLeft === 0 
              ? t('passwordModal.expiredToday', 'Kedaluwarsa Hari Ini') 
              : t('passwordModal.daysRemaining', { count: pwdDaysLeft, defaultValue: `Tersisa ${pwdDaysLeft} hari lagi` })}
          </span>
        </div>

        {/* Deskripsi */}
        <p className="text-sm text-gray-600 my-4 leading-relaxed">
          {isCritical 
            ? t('passwordModal.criticalDesc', 'Masa berlaku password akun Anda akan segera habis. Harap segera perbarui password Anda untuk menjaga keamanan akun dan mencegah pemblokiran akses.')
            : t('passwordModal.warningDesc', { date: expiryDateFormatted, defaultValue: `Sesuai kebijakan keamanan BSI, password wajib diperbarui setiap 180 hari. Password Anda akan kedaluwarsa pada tanggal ${expiryDateFormatted}.` })}
        </p>

        {/* Tombol Aksi */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {!isCritical && (
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 rounded-xl h-11 border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
            >
              {t('passwordModal.dismiss', 'Tutup')}
            </Button>
          )}

          <Button
            onClick={handleGoToSettings}
            style={!isCritical ? { backgroundColor: THEME.TOSCA } : {}}
            className={`flex-1 rounded-xl h-11 text-white font-bold shadow-lg transition-all ${
              isCritical ? 'bg-red-600 hover:bg-red-700' : 'hover:brightness-95'
            }`}
          >
            {t('passwordModal.changeNow', 'Ganti Password Sekarang')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}