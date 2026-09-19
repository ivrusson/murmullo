import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  buildFeedbackMarkdown,
  copyText,
  openFeedbackIssue,
} from '@/lib/githubFeedback';

type PendingCrash = {
  source: string;
  message: string;
  stack?: string | null;
  version: string;
  os: string;
  locale: string;
  environment: string;
  recorded_at: string;
};

const copy = {
  es: {
    title: 'Murmullo se detuvo',
    lede: 'Puedes enviar el fallo a GitHub. No se adjunta audio ni dictados. Nada se envía hasta que confirmes en el navegador.',
    comment: 'Qué estabas haciendo (opcional)',
    commentPlaceholder:
      'Por ejemplo: solté el atajo con Slack en primer plano.',
    send: 'Enviar a GitHub',
    copy: 'Copiar',
    dismiss: 'Descartar',
    hint: 'Si no tienes cuenta de GitHub, copia el informe y pégalo más tarde.',
    empty: 'No hay un informe pendiente.',
    sent: 'Se abrió GitHub. Revisa el formulario y pulsa Submit.',
    copied: 'Informe copiado.',
    failed: 'No se pudo abrir GitHub. Copia el informe.',
    copyFailed: 'No se pudo copiar.',
    defaultDescription:
      'La app capturó un crash. Comentario del usuario: (ninguno)',
  },
  en: {
    title: 'Murmullo stopped',
    lede: 'You can send this crash to GitHub. Audio and dictations are not attached. Nothing is sent until you confirm in the browser.',
    comment: 'What you were doing (optional)',
    commentPlaceholder:
      'For example: I released the shortcut with Slack focused.',
    send: 'Send to GitHub',
    copy: 'Copy',
    dismiss: 'Dismiss',
    hint: 'If you do not have a GitHub account, copy the report and paste it later.',
    empty: 'There is no pending report.',
    sent: 'GitHub opened. Review the form and press Submit.',
    copied: 'Report copied.',
    failed: 'Could not open GitHub. Copy the report instead.',
    copyFailed: 'Could not copy.',
    defaultDescription: 'The app captured a crash. User comment: (none)',
  },
};

function localeOf(value: string | undefined): 'es' | 'en' {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function $(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}

function setStatus(text: string, tone: 'info' | 'error' = 'info') {
  const status = $('status');
  status.textContent = text;
  status.dataset.tone = tone;
}

function crashTitle(crash: PendingCrash): string {
  const message = crash.message.replace(/\s+/g, ' ').trim();
  const clipped = message.length > 72 ? `${message.slice(0, 69)}…` : message;
  return `[Crash]: ${clipped || crash.source}`;
}

function fieldsFrom(crash: PendingCrash, comment: string) {
  const note = comment.trim();
  const description = note
    ? note
    : crash.source === 'rust-panic'
      ? `Rust panic: ${crash.message}`
      : crash.message;
  return {
    title: crashTitle(crash),
    description,
    environment: crash.environment,
    stack: [crash.message, crash.stack].filter(Boolean).join('\n\n'),
    actual: crash.message,
  };
}

async function closeWindow() {
  try {
    await getCurrentWindow().close();
  } catch {
    window.close();
  }
}

async function main() {
  const crash = await invoke<PendingCrash | null>('get_pending_crash');
  const lang = localeOf(
    crash?.locale || window.localStorage.getItem('murmullo-locale') || undefined
  );
  const t = copy[lang];
  document.documentElement.lang = lang === 'en' ? 'en' : 'es';

  $('title').textContent = t.title;
  $('lede').textContent = t.lede;
  $('comment-label').textContent = t.comment;
  const comment = $('comment') as HTMLTextAreaElement;
  comment.placeholder = t.commentPlaceholder;
  $('send').textContent = t.send;
  $('copy').textContent = t.copy;
  $('dismiss').textContent = t.dismiss;
  $('hint').textContent = t.hint;

  if (!crash) {
    $('message').textContent = t.empty;
    ($('send') as HTMLButtonElement).disabled = true;
    ($('copy') as HTMLButtonElement).disabled = true;
    $('dismiss').addEventListener('click', () => void closeWindow());
    return;
  }

  $('message').textContent = crash.message;
  if (crash.stack) {
    const stack = $('stack');
    stack.hidden = false;
    stack.textContent = crash.stack;
  }

  const send = $('send') as HTMLButtonElement;
  const copyBtn = $('copy') as HTMLButtonElement;
  const dismiss = $('dismiss') as HTMLButtonElement;

  send.addEventListener('click', async () => {
    send.disabled = true;
    try {
      await openFeedbackIssue('crash', fieldsFrom(crash, comment.value));
      await invoke('clear_pending_crash');
      setStatus(t.sent);
      window.setTimeout(() => void closeWindow(), 800);
    } catch {
      send.disabled = false;
      setStatus(t.failed, 'error');
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await copyText(
        buildFeedbackMarkdown('crash', fieldsFrom(crash, comment.value))
      );
      setStatus(t.copied);
    } catch {
      setStatus(t.copyFailed, 'error');
    }
  });

  dismiss.addEventListener('click', async () => {
    await invoke('clear_pending_crash');
    await closeWindow();
  });
}

void main().catch(error => {
  setStatus(error instanceof Error ? error.message : String(error), 'error');
});
