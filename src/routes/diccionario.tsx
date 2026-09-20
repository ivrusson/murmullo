import { createFileRoute } from '@tanstack/react-router';
import { DictionaryPage } from '@/components/pages/DictionaryPage';

export const Route = createFileRoute('/diccionario')({
  component: DictionaryPage,
});
