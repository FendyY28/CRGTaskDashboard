import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const currentLang = i18n.language || "en";
    const nextLang = currentLang.startsWith("en") ? "id" : "en";
    
    i18n.changeLanguage(nextLang);
  };

  return (
    <button 
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95"
      title="Ubah Bahasa / Change Language"
    >
      <Globe className="h-4 w-4 text-gray-400" />
      {i18n.language?.startsWith("en") ? "EN" : "ID"}
    </button>
  );
}