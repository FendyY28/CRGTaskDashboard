import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enJSON from './locales/en.json';
import idJSON from './locales/id.json';

i18n
  // Mendeteksi bahasa browser user secara otomatis
  .use(LanguageDetector)
  // Meneruskan instance i18n ke react-i18next
  .use(initReactI18next)
  // Inisialisasi i18next
  .init({
    resources: {
      en: { translation: enJSON },
      id: { translation: idJSON }
    },
    fallbackLng: 'en', // Jika bahasa tidak ditemukan, gunakan bahasa Inggris
    interpolation: {
      escapeValue: false // React sudah aman dari XSS secara bawaan
    }
  });

export default i18n;