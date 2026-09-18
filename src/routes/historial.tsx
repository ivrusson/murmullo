import { createFileRoute } from '@tanstack/react-router';
import { TranscriptionsPage } from '@/components/pages/TranscriptionsPage';

type HistorialSearch = {
  q?: string;
};

export const Route = createFileRoute('/historial')({
  validateSearch: (search: Record<string, unknown>): HistorialSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: TranscriptionsPage,
});
