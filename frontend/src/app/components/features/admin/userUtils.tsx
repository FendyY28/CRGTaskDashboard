import { ShieldAlert, ShieldCheck, Briefcase } from "lucide-react";
import { Badge } from "../../ui/badge";
import { THEME } from "../../../constants/projectConstants"; 

/** Dates arrive from the API and may be absent on optimistic/local rows. */
type OptionalDate = string | null | undefined;

export const formatDate = (isoString: OptionalDate, locale: string = 'id-ID') => {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const isNewUser = (isoString: OptionalDate) => {
  if (!isoString) return false;
  const diffTime = Math.abs(new Date().getTime() - new Date(isoString).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
};

export const RoleBadge = ({ role }: { role?: string | null }) => {
  switch (role?.toUpperCase()) {
    case 'ADMIN': 
      return (
        <Badge className="bg-rose-100 text-rose-700 border-none shadow-none">
          <ShieldAlert className="w-3 h-3 mr-1"/> ADMIN
        </Badge>
      );
    case 'HEAD': 
      return (
        <Badge 
          style={{ backgroundColor: `${THEME.BSI_YELLOW}1A`, color: THEME.BSI_YELLOW }} 
          className="border-none shadow-none"
        >
          <ShieldCheck className="w-3 h-3 mr-1"/> HEAD
        </Badge>
      );
    default: 
      return (
        <Badge 
          style={{ backgroundColor: `${THEME.TOSCA}1A`, color: THEME.TOSCA }} 
          className="border-none shadow-none"
        >
          <Briefcase className="w-3 h-3 mr-1"/> OFFICER
        </Badge>
      );
  }
};