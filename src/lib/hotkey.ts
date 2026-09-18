export const DEFAULT_PUSH_TO_TALK = 'Cmd+Option+T';

const MODIFIER_DISPLAY: Record<string, string> = {
  command: 'Cmd',
  cmd: 'Cmd',
  super: 'Cmd',
  meta: 'Cmd',
  win: 'Win',
  option: 'Opt',
  alt: 'Opt',
  control: 'Ctrl',
  ctrl: 'Ctrl',
  shift: 'Shift',
};

const MODIFIER_KEYS = new Set([
  'Meta',
  'MetaLeft',
  'MetaRight',
  'Control',
  'ControlLeft',
  'ControlRight',
  'Alt',
  'AltLeft',
  'AltRight',
  'Shift',
  'ShiftLeft',
  'ShiftRight',
  'OS',
  'OSLeft',
  'OSRight',
]);

const CODE_KEYS: Record<string, string> = {
  Space: 'Space',
  Tab: 'Tab',
  Enter: 'Enter',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
};

const RESERVED = new Set([
  'Cmd+Space',
  'Cmd+Tab',
  'Cmd+Q',
  'Ctrl+Tab',
  'Alt+Tab',
  'Ctrl+Alt+Delete',
]);

export function formatHotkey(binding?: string | null): string {
  const raw = (binding ?? '').trim() || DEFAULT_PUSH_TO_TALK;
  return raw
    .split('+')
    .map(token => displayToken(token.trim()))
    .filter(Boolean)
    .join('+');
}

export function hotkeyParts(binding?: string | null): string[] {
  return formatHotkey(binding).split('+').filter(Boolean);
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key) || MODIFIER_KEYS.has(event.code)) {
    return null;
  }

  const parts: string[] = [];
  if (event.metaKey) parts.push('Cmd');
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Option');
  if (event.shiftKey) parts.push('Shift');
  if (parts.length === 0) {
    return null;
  }

  const key = keyFromCode(event.code, event.key);
  if (!key) return null;
  parts.push(key);
  return parts.join('+');
}

export function validateHotkey(
  binding: string,
  occupied: string[] = []
): string | null {
  const trimmed = binding.trim();
  if (!trimmed) {
    return 'El atajo no puede estar vacío';
  }

  const tokens = trimmed
    .split('+')
    .map(token => token.trim())
    .filter(Boolean);
  if (tokens.length < 2) {
    return 'Incluye al menos un modificador y una tecla';
  }

  const display = formatHotkey(trimmed);
  if (RESERVED.has(display)) {
    return 'Ese atajo está reservado por el sistema';
  }

  const normalized = display.toLowerCase();
  for (const other of occupied) {
    if (other && formatHotkey(other).toLowerCase() === normalized) {
      return 'Ese atajo ya está asignado a otra acción';
    }
  }

  return null;
}

function displayToken(token: string): string {
  const mapped = MODIFIER_DISPLAY[token.toLowerCase()];
  if (mapped) return mapped;
  if (/^key[a-z]$/i.test(token)) return token.slice(3).toUpperCase();
  if (/^digit[0-9]$/i.test(token)) return token.slice(5);
  if (/^f\d{1,2}$/i.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function keyFromCode(code: string, key: string): string | null {
  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3).toUpperCase();
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return code.slice(5);
  }
  if (/^F\d{1,2}$/.test(code)) {
    return code;
  }
  if (CODE_KEYS[code]) {
    return CODE_KEYS[code];
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return null;
}
