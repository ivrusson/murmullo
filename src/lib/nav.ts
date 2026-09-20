import { BookOpen, Cpu, History, Home, Settings, Shield } from 'lucide-react';
import { t, type AppMessageKey } from '@/i18n';

export const navItems = [
  {
    to: '/',
    labelKey: 'nav.home' as const satisfies AppMessageKey,
    icon: Home,
  },
  {
    to: '/historial',
    labelKey: 'nav.history' as const satisfies AppMessageKey,
    icon: History,
  },
  {
    to: '/diccionario',
    labelKey: 'nav.dictionary' as const satisfies AppMessageKey,
    icon: BookOpen,
  },
  {
    to: '/runtimes',
    labelKey: 'nav.runtimes' as const satisfies AppMessageKey,
    icon: Cpu,
  },
  {
    to: '/permisos',
    labelKey: 'nav.permissions' as const satisfies AppMessageKey,
    icon: Shield,
  },
  {
    to: '/ajustes',
    labelKey: 'nav.settings' as const satisfies AppMessageKey,
    icon: Settings,
  },
] as const;

export type AppPath = (typeof navItems)[number]['to'];

export function titleForPath(pathname: string): string {
  const match = navItems.find(item => item.to === pathname);
  return match ? t(match.labelKey) : t('common.brand');
}
