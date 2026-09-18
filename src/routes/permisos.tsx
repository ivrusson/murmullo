import { createFileRoute } from '@tanstack/react-router';
import { PermissionsPage } from '@/components/pages/PermissionsPage';

export const Route = createFileRoute('/permisos')({
  component: PermissionsPage,
});
