export const GITHUB_OWNER = 'ivrusson';
export const GITHUB_REPO = 'murmullo';
export const GITHUB_ISSUES_NEW = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new`;

export type FeedbackKind = 'bug' | 'feature' | 'crash';

export const FEEDBACK_TEMPLATES: Record<FeedbackKind, string> = {
  bug: 'bug_report.yml',
  feature: 'feature_request.yml',
  crash: 'crash_report.yml',
};

export type FeedbackFields = {
  title?: string;
  description?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  environment?: string;
  stack?: string;
};

const FIELD_IDS = [
  'description',
  'steps',
  'expected',
  'actual',
  'environment',
  'stack',
] as const;

const MAX_URL_LENGTH = 6500;

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const marker = '\n…(truncated)';
  return `${text.slice(0, Math.max(0, max - marker.length))}${marker}`;
}

function buildUrl(kind: FeedbackKind, fields: FeedbackFields): string {
  const params = new URLSearchParams();
  params.set('template', FEEDBACK_TEMPLATES[kind]);
  if (fields.title?.trim()) {
    params.set('title', fields.title.trim());
  }
  for (const id of FIELD_IDS) {
    const value = fields[id]?.trim();
    if (value) params.set(id, value);
  }
  return `${GITHUB_ISSUES_NEW}?${params.toString()}`;
}

export function buildFeedbackUrl(
  kind: FeedbackKind,
  fields: FeedbackFields
): string {
  let next: FeedbackFields = {
    ...fields,
    stack: fields.stack ? clip(fields.stack, 4000) : fields.stack,
    environment: fields.environment
      ? clip(fields.environment, 1500)
      : fields.environment,
    description: fields.description
      ? clip(fields.description, 2500)
      : fields.description,
  };

  let url = buildUrl(kind, next);
  while (url.length > MAX_URL_LENGTH) {
    const stack = next.stack ?? '';
    if (stack.length > 240) {
      next = { ...next, stack: clip(stack, Math.floor(stack.length * 0.65)) };
      url = buildUrl(kind, next);
      continue;
    }
    const description = next.description ?? '';
    if (description.length > 240) {
      next = {
        ...next,
        description: clip(description, Math.floor(description.length * 0.65)),
      };
      url = buildUrl(kind, next);
      continue;
    }
    break;
  }
  return url;
}

export function buildFeedbackMarkdown(
  kind: FeedbackKind,
  fields: FeedbackFields
): string {
  const heading =
    kind === 'feature'
      ? 'Feature request'
      : kind === 'crash'
        ? 'Crash report'
        : 'Bug report';
  const lines = [`# ${heading}`, ''];
  if (fields.title?.trim()) {
    lines.push(`**Title:** ${fields.title.trim()}`, '');
  }
  const sections: Array<[string, string | undefined]> = [
    ['Description', fields.description],
    ['Steps', fields.steps],
    ['Expected', fields.expected],
    ['Actual', fields.actual],
    ['Environment', fields.environment],
    ['Stack', fields.stack],
  ];
  for (const [label, value] of sections) {
    if (!value?.trim()) continue;
    lines.push(`## ${label}`, '', '```', value.trim(), '```', '');
  }
  lines.push(`Open: ${GITHUB_ISSUES_NEW}?template=${FEEDBACK_TEMPLATES[kind]}`);
  return lines.join('\n');
}

export async function openExternalUrl(url: string): Promise<void> {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  } catch {
    // Not running inside Tauri, or the plugin is unavailable.
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    throw new Error('Could not open the browser');
  }
}

export async function openFeedbackIssue(
  kind: FeedbackKind,
  fields: FeedbackFields
): Promise<string> {
  const url = buildFeedbackUrl(kind, fields);
  await openExternalUrl(url);
  return url;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Clipboard is not available');
}
