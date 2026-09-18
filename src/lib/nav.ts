import {
  BookOpen,
  Cpu,
  History,
  LayoutGrid,
  Settings,
  Shield,
} from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Escritorio', icon: LayoutGrid },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/diccionario', label: 'Diccionario', icon: BookOpen },
  { to: '/runtimes', label: 'Runtimes', icon: Cpu },
  { to: '/permisos', label: 'Permisos', icon: Shield },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
] as const;

export type AppPath = (typeof navItems)[number]['to'];

export function titleForPath(pathname: string): string {
  const match = navItems.find(item => item.to === pathname);
  return match?.label ?? 'Murmullo';
}
