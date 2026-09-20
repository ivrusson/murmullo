import { createFileRoute } from '@tanstack/react-router';
import { RuntimePage } from '@/components/pages/RuntimePage';

export const Route = createFileRoute('/runtimes')({
  component: RuntimePage,
});
