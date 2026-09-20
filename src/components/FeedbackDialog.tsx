import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { invoke } from '@tauri-apps/api/core';
import { Bug, Lightbulb } from 'lucide-react';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { Button } from '@/components/ui-system/Button';
import { Tooltip } from '@/components/ui-system/Tooltip';
import { Input } from '@/components/ui-system/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-system/Dialog';
import { toast } from '@/components/ui-system/toast';
import { useT } from '@/i18n';
import {
  buildFeedbackMarkdown,
  copyText,
  openFeedbackIssue,
  type FeedbackKind,
} from '@/lib/githubFeedback';

const styles = stylex.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    maxHeight: 'min(60vh, 420px)',
    overflowY: 'auto',
    paddingRight: 4,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    color: color.muted,
  },
  textarea: {
    width: '100%',
    minHeight: 88,
    resize: 'vertical',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.surface,
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 1.45,
    paddingBlock: 10,
    paddingInline: 12,
  },
  env: {
    margin: 0,
    maxHeight: 88,
    overflow: 'auto',
    padding: 10,
    borderRadius: 12,
    backgroundColor: color.raised,
    color: color.muted,
    fontFamily: font.mono,
    fontSize: 11,
    whiteSpace: 'pre-wrap',
  },
});

export type FeedbackDialogKind = Extract<FeedbackKind, 'bug' | 'feature'>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: FeedbackDialogKind;
  initialTitle?: string;
  initialDescription?: string;
  initialActual?: string;
  initialStack?: string;
};

type FeedbackEnvironment = {
  summary: string;
};

export function FeedbackDialog({
  open,
  onOpenChange,
  kind,
  initialTitle = '',
  initialDescription = '',
  initialActual = '',
  initialStack = '',
}: Props) {
  const t = useT();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState(initialActual);
  const [environment, setEnvironment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDescription(initialDescription);
    setSteps('');
    setExpected('');
    setActual(initialActual);
    void invoke<FeedbackEnvironment>('get_feedback_environment')
      .then(env => setEnvironment(env.summary))
      .catch(() => {
        setEnvironment(
          [
            `Murmullo`,
            `OS: ${navigator.platform}`,
            `Locale: ${document.documentElement.lang || 'es'}`,
            `STT: unknown`,
            `LLM: unknown`,
          ].join('\n')
        );
      });
  }, [open, initialActual, initialDescription, initialTitle]);

  const fields = {
    title,
    description,
    steps: kind === 'bug' ? steps : steps,
    expected: kind === 'bug' ? expected : expected,
    actual: kind === 'bug' ? actual : actual,
    environment,
    stack: initialStack,
  };

  const submit = async (mode: 'open' | 'copy') => {
    if (!title.trim()) {
      toast.error(t('feedback.titleRequired'));
      return;
    }
    if (!description.trim()) {
      toast.error(t('feedback.descriptionRequired'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'copy') {
        await copyText(buildFeedbackMarkdown(kind, fields));
        toast.success(t('feedback.copied'));
        return;
      }
      await openFeedbackIssue(kind, fields);
      onOpenChange(false);
    } catch {
      toast.error(t('feedback.openFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === 'feature'
              ? t('feedback.featureTitle')
              : t('feedback.bugTitle')}
          </DialogTitle>
          <DialogDescription>
            {kind === 'feature'
              ? t('feedback.featureBody')
              : t('feedback.bugBody')}
          </DialogDescription>
        </DialogHeader>
        <div {...sx(styles.form)}>
          <label {...sx(styles.field)}>
            <span {...sx(styles.label)}>{t('feedback.fieldTitle')}</span>
            <Input
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={120}
            />
          </label>
          <label {...sx(styles.field)}>
            <span {...sx(styles.label)}>{t('feedback.fieldDescription')}</span>
            <textarea
              {...sx(styles.textarea)}
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </label>
          {kind === 'bug' ? (
            <>
              <label {...sx(styles.field)}>
                <span {...sx(styles.label)}>{t('feedback.fieldSteps')}</span>
                <textarea
                  {...sx(styles.textarea)}
                  value={steps}
                  onChange={event => setSteps(event.target.value)}
                />
              </label>
              <label {...sx(styles.field)}>
                <span {...sx(styles.label)}>{t('feedback.fieldExpected')}</span>
                <textarea
                  {...sx(styles.textarea)}
                  value={expected}
                  onChange={event => setExpected(event.target.value)}
                />
              </label>
              <label {...sx(styles.field)}>
                <span {...sx(styles.label)}>{t('feedback.fieldActual')}</span>
                <textarea
                  {...sx(styles.textarea)}
                  value={actual}
                  onChange={event => setActual(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <div {...sx(styles.field)}>
            <p {...sx(styles.label)}>{t('feedback.environment')}</p>
            <pre {...sx(styles.env)}>{environment || '…'}</pre>
          </div>
        </div>
        <DialogFooter>
          <Button
            tone="quiet"
            disabled={busy}
            onClick={() => void submit('copy')}
          >
            {t('feedback.copyReport')}
          </Button>
          <Button disabled={busy} onClick={() => void submit('open')}>
            {t('feedback.openGithub')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const launchStyles = stylex.create({
  cluster: {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    backgroundColor: color.raised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
  },
  iconBtn: {
    width: 32,
    height: 32,
    padding: 0,
    color: color.muted,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export function FeedbackLaunchButtons({
  compact = false,
}: {
  compact?: boolean;
}) {
  const t = useT();
  const [kind, setKind] = useState<FeedbackDialogKind | null>(null);
  const dialog = kind ? (
    <FeedbackDialog
      open
      kind={kind}
      onOpenChange={open => {
        if (!open) setKind(null);
      }}
    />
  ) : null;

  if (compact) {
    return (
      <>
        <div
          {...sx(launchStyles.cluster)}
          role="group"
          aria-label={t('feedback.helpTitle')}
        >
          <Tooltip label={t('feedback.reportBug')}>
            <Button
              tone="ghost"
              size="icon"
              xstyle={launchStyles.iconBtn}
              aria-label={t('feedback.reportBug')}
              onClick={() => setKind('bug')}
            >
              <Bug size={16} strokeWidth={1.7} aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip label={t('feedback.requestFeature')}>
            <Button
              tone="ghost"
              size="icon"
              xstyle={launchStyles.iconBtn}
              aria-label={t('feedback.requestFeature')}
              onClick={() => setKind('feature')}
            >
              <Lightbulb size={16} strokeWidth={1.7} aria-hidden />
            </Button>
          </Tooltip>
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
      <div {...sx(launchStyles.row)}>
        <Button tone="quiet" size="sm" onClick={() => setKind('bug')}>
          <Bug size={15} strokeWidth={1.7} aria-hidden />
          {t('feedback.reportBug')}
        </Button>
        <Button tone="quiet" size="sm" onClick={() => setKind('feature')}>
          <Lightbulb size={15} strokeWidth={1.7} aria-hidden />
          {t('feedback.requestFeature')}
        </Button>
      </div>
      {dialog}
    </>
  );
}
