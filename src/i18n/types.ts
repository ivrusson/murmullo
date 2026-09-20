import { es } from './messages/es';
import type { MessageKey } from './t';

export type Messages = typeof es;

export type AppMessageKey = MessageKey<Messages>;
