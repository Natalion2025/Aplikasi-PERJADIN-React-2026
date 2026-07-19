import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(initReactI18next) // Mengintegrasikan i18n dengan React (HARUS PERTAMA)
  .use(HttpApi) // Memuat terjemahan dari server/folder publik (setelah init)
  .use(LanguageDetector) // Mendeteksi bahasa pengguna
  .init({
    supportedLngs: ['id', 'en'],
    fallbackLng: 'id',
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json', // Path ke file terjemahan
    },
    react: {
      useSuspense: true, // Aktifkan Suspense untuk menangani loading terjemahan
    },
  });

export default i18n;
