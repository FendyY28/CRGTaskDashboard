import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  TestTube2,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./projectConstants";

interface NavItem {
  /** Route segment and translation key suffix (`header.menu.<id>`). */
  id: string;
  icon: LucideIcon;
  /** Shown only to this role. Undefined means every authenticated role. */
  adminOnly?: boolean;
}

/**
 * Single source of truth for primary navigation. The header renders these
 * inline on desktop and inside the mobile drawer on small screens, so a route
 * must never be added in one place and forgotten in the other.
 *
 * Labels are resolved at render time with `t(\`header.menu.${item.id}\`)` so a
 * language switch re-renders them correctly instead of keeping stale strings.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "analytics", icon: BarChart3 },
  { id: "timeline", icon: ListChecks },
  { id: "testing", icon: TestTube2 },
  { id: "post-implementation", icon: ClipboardCheck },
  { id: "audit-trail", icon: ShieldCheck },
  { id: "users", icon: Users, adminOnly: true },
];

export const getNavItemsForRole = (role: Role | string): NavItem[] =>
  NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");

export const isNavItemActive = (pathname: string, id: string): boolean =>
  pathname === `/${id}` || pathname.startsWith(`/${id}/`);
