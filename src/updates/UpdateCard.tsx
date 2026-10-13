import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Circle,
  Download,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '@/components/ui-system/Button';
import { Chip } from '@/components/ui-system/Chip';
import { Surface } from '@/components/ui-system/Surface';
import { sx } from '@/components/ui-system/sx';
import { spin } from '@/components/ui-system/spin';
import { useT } from '@/i18n';
import type { AppMessageKey } from '@/i18n';
import { updateService } from '@/services/tauri';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import {
  parseChangelog,
  releaseFor,
  releasesBetween,
  type ChangelogRelease,
} from './changelog';
import {
  overallPercent,
  stepStates,
  UPDATE_STEPS,
  type StepState,
  type UpdateStatus,
} from './progress';
import { useAppUpdate } from './useAppUpdate';

const slide = stylex.keyframes({
  from: { transform: 'translateX(-100%)' },
  to: { transform: 'translateX(250%)' },
});

const styles = stylex.create({
  kicker: {
    margin: 0,
    marginBottom: space.md,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  copy: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '20px',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 15,
    fontWeight: 600,
    color: color.ink,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
    marginTop: space.md,
  },
  block: {
    marginTop: space.md,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  track: {
    position: 'relative',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: color.iris,
    transitionProperty: 'width',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease-out',
  },
  indeterminate: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    borderRadius: radius.pill,
    backgroundColor: color.iris,
    animationName: {
      default: slide,
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  percentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.md,
  },
  percent: {
    fontFamily: font.mono,
    fontSize: 12,
    color: color.muted,
  },
  steps: {
    listStyle: 'none',
    margin: 0,
    marginTop: space.xs,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    fontFamily: font.sans,
    fontSize: 13,
  },
  stepPending: { color: color.muted, opacity: 0.7 },
  stepActive: { color: color.ink, fontWeight: 600 },
  stepDone: { color: color.sage },
  detail: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: 11,
    lineHeight: '16px',
    color: color.muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  note: {
    margin: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '18px',
  },
  banner: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  bannerOk: {
    backgroundColor: '#EDF4EE',
    borderColor: 'rgba(71, 120, 78, 0.25)',
  },
  bannerNew: {
    backgroundColor: '#F4F0F9',
    borderColor: 'rgba(110, 86, 150, 0.25)',
  },
  bannerBad: {
    backgroundColor: 'rgba(224, 131, 126, 0.06)',
    borderColor: 'rgba(224, 131, 126, 0.3)',
  },
  bannerTitle: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
    color: color.ink,
  },
  notes: {
    marginTop: space.md,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    maxHeight: 320,
    overflowY: 'auto',
    paddingInlineEnd: space.xs,
  },
  release: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  releaseHead: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 600,
    color: color.ink,
  },
  groupTitle: {
    margin: 0,
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: color.muted,
  },
  list: {
    margin: 0,
    paddingInlineStart: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '19px',
    color: '#5A5551',
  },
  code: {
    fontFamily: font.mono,
    fontSize: 12,
    backgroundColor: 'rgba(28, 26, 25, 0.06)',
    borderRadius: 4,
    paddingInline: 4,
  },
  log: {
    margin: 0,
    marginTop: space.sm,
    padding: space.sm,
    maxHeight: 180,
    overflow: 'auto',
    borderRadius: radius.sm,
    backgroundColor: color.raised,
    fontFamily: font.mono,
    fontSize: 11,
    lineHeight: '16px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: color.ink,
  },
  chevron: {
    flexShrink: 0,
    transitionProperty: 'transform',
    transitionDuration: '140ms',
  },
  chevronOpen: { transform: 'rotate(180deg)' },
});

const GROUP_KEYS: Record<string, AppMessageKey> = {
  Added: 'updates.groups.Added',
  Changed: 'updates.groups.Changed',
  Fixed: 'updates.groups.Fixed',
  Removed: 'updates.groups.Removed',
  Deprecated: 'updates.groups.Deprecated',
  Security: 'updates.groups.Security',
};

const STEP_KEYS: Record<(typeof UPDATE_STEPS)[number], AppMessageKey> = {
  release: 'updates.steps.release',
  dependencies: 'updates.steps.dependencies',
  apply: 'updates.steps.apply',
  install: 'updates.steps.install',
  restart: 'updates.steps.restart',
};

function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, index) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={index} {...sx(styles.code)}>
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function ReleaseNotes({ releases }: { releases: ChangelogRelease[] }) {
  const t = useT();
  if (releases.length === 0) {
    return <p {...sx(styles.copy)}>{t('updates.noNotes')}</p>;
  }
  return (
    <div {...sx(styles.notes)}>
      {releases.map(release => (
        <div key={release.version} {...sx(styles.release)}>
          <p {...sx(styles.releaseHead)}>
            v{release.version}
            {release.date ? ` · ${release.date}` : ''}
          </p>
          {release.groups.map((group, index) => (
            <div key={`${group.title}-${index}`}>
              {group.title ? (
                <p {...sx(styles.groupTitle)}>
                  {GROUP_KEYS[group.title]
                    ? t(GROUP_KEYS[group.title])
                    : group.title}
                </p>
              ) : null}
              <ul {...sx(styles.list)}>
                {group.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <Check size={14} strokeWidth={2} />;
  if (state === 'active') {
    return <LoaderCircle size={14} strokeWidth={2} {...sx(spin.icon)} />;
  }
  return <Circle size={14} strokeWidth={1.5} />;
}

function ProgressBar({ percent }: { percent: number | null }) {
  return (
    <div
      {...sx(styles.track)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
    >
      {percent === null ? (
        <div {...sx(styles.indeterminate)} />
      ) : (
        <div {...sx(styles.fill)} style={{ width: `${percent}%` }} />
      )}
    </div>
  );
}

function RunningPanel({ status }: { status: UpdateStatus }) {
  const t = useT();
  const percent = overallPercent(status);
  const states = stepStates(status.phase);
  const version = status.target.replace(/^v/, '');
  return (
    <div {...sx(styles.block)}>
      <div {...sx(styles.percentRow)}>
        <p {...sx(styles.title)}>{t('updates.updatingTo', { version })}</p>
        <span {...sx(styles.percent)}>
          {percent === null ? t('updates.preparing') : `${percent}%`}
        </span>
      </div>
      <ProgressBar percent={percent} />
      <ul {...sx(styles.steps)}>
        {UPDATE_STEPS.map((step, index) => (
          <li
            key={step}
            {...sx(
              styles.step,
              states[index] === 'pending' && styles.stepPending,
              states[index] === 'active' && styles.stepActive,
              states[index] === 'done' && styles.stepDone
            )}
          >
            <StepIcon state={states[index]} />
            {t(STEP_KEYS[step])}
          </li>
        ))}
      </ul>
      {status.detail ? (
        <p {...sx(styles.detail)} title={status.detail}>
          {status.detail}
        </p>
      ) : null}
      <p {...sx(styles.note)}>{t('updates.keepOpenNote')}</p>
    </div>
  );
}

function FailedPanel({
  status,
  interrupted,
  canRetry,
  onRetry,
  onDismiss,
}: {
  status: UpdateStatus;
  interrupted: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState('');

  useEffect(() => {
    if (!showLog) return;
    void updateService
      .log()
      .then(setLog)
      .catch(() => setLog(''));
  }, [showLog]);

  return (
    <div {...sx(styles.banner, styles.bannerBad)} role="alert">
      <p {...sx(styles.bannerTitle)}>
        <TriangleAlert size={16} strokeWidth={1.75} />
        {t('updates.failedTitle')}
      </p>
      <p {...sx(styles.copy)}>
        {interrupted ? t('updates.interrupted') : status.detail}
      </p>
      <p {...sx(styles.note)}>{t('updates.nothingChanged')}</p>
      <div {...sx(styles.actions)}>
        {canRetry ? (
          <Button tone="quiet" size="sm" onClick={onRetry}>
            <RefreshCw size={14} strokeWidth={1.5} />
            {t('updates.retry')}
          </Button>
        ) : null}
        <Button tone="ghost" onClick={() => setShowLog(value => !value)}>
          {showLog ? t('updates.hideLog') : t('updates.showLog')}
        </Button>
        <Button tone="ghost" onClick={onDismiss}>
          {t('updates.dismiss')}
        </Button>
      </div>
      {showLog ? <pre {...sx(styles.log)}>{log || '—'}</pre> : null}
    </div>
  );
}

export function UpdateCard() {
  const t = useT();
  const update = useAppUpdate();
  const [showNotes, setShowNotes] = useState(false);
  const { info, view, current } = update;

  const releases = info?.notes ? parseChangelog(info.notes) : [];
  const shownVersion = update.justUpdated ?? info?.latest ?? null;
  const notes =
    info?.update_available && info.latest
      ? releasesBetween(releases, info.current, info.latest)
      : shownVersion
        ? [releaseFor(releases, shownVersion)].filter(
            (release): release is ChangelogRelease => Boolean(release)
          )
        : [];
  const busy = view.kind === 'running' || update.starting;
  const canUpdate =
    Boolean(info?.update_available) && !info?.has_local_changes && !busy;

  return (
    <Surface>
      <p {...sx(styles.kicker)}>{t('updates.title')}</p>
      <div {...sx(styles.head)}>
        <p {...sx(styles.copy)}>
          {t('updates.installed')}:{' '}
          <strong>{current ? `v${current}` : '—'}</strong>
        </p>
        {view.kind !== 'running' ? (
          <Button
            tone="quiet"
            size="sm"
            disabled={update.checking || update.starting}
            onClick={() => void update.check()}
          >
            <RefreshCw
              size={14}
              strokeWidth={1.5}
              {...(update.checking ? sx(spin.icon) : {})}
            />
            {update.checking ? t('updates.checking') : t('updates.check')}
          </Button>
        ) : null}
      </div>

      {view.kind === 'running' ? <RunningPanel status={view.status} /> : null}

      {view.kind === 'failed' ? (
        <FailedPanel
          status={view.status}
          interrupted={view.interrupted}
          canRetry={!busy}
          onRetry={() => void update.start(view.status.target)}
          onDismiss={() => void update.dismiss()}
        />
      ) : null}

      {update.justUpdated && view.kind === 'idle' ? (
        <div {...sx(styles.banner, styles.bannerOk)}>
          <p {...sx(styles.bannerTitle)}>
            <Check size={16} strokeWidth={2} />
            {t('updates.doneTitle', { version: update.justUpdated })}
          </p>
          <p {...sx(styles.copy)}>{t('updates.doneBody')}</p>
        </div>
      ) : null}

      {update.checkError ? (
        <div {...sx(styles.banner, styles.bannerBad)} role="alert">
          <p {...sx(styles.copy)}>{update.checkError}</p>
        </div>
      ) : null}

      {info && !info.supported ? (
        <p {...sx(styles.copy)} style={{ marginTop: 12 }}>
          {t('updates.unsupported')}
        </p>
      ) : null}

      {info?.supported && view.kind === 'idle' && !update.justUpdated ? (
        info.update_available && info.latest ? (
          <div {...sx(styles.banner, styles.bannerNew)}>
            <p {...sx(styles.bannerTitle)}>
              <Download size={16} strokeWidth={1.75} />
              {t('updates.available', { version: info.latest })}
              <Chip tone="iris">v{info.latest}</Chip>
            </p>
            <p {...sx(styles.copy)}>
              {t('updates.availableBody', { current: info.current })}
            </p>
            {info.has_local_changes ? (
              <p {...sx(styles.note)}>{t('updates.localChanges')}</p>
            ) : null}
            <div {...sx(styles.actions)}>
              <Button
                tone="primary"
                size="sm"
                disabled={!canUpdate}
                onClick={() => void update.start()}
              >
                <Download size={14} strokeWidth={1.5} />
                {t('updates.update')}
              </Button>
              <Button tone="ghost" onClick={() => setShowNotes(v => !v)}>
                {showNotes ? t('updates.hideNotes') : t('updates.whatsNew')}
                <ChevronDown
                  size={14}
                  strokeWidth={1.5}
                  {...sx(styles.chevron, showNotes && styles.chevronOpen)}
                />
              </Button>
            </div>
          </div>
        ) : (
          <div {...sx(styles.banner, styles.bannerOk)}>
            <p {...sx(styles.bannerTitle)}>
              <Check size={16} strokeWidth={2} />
              {t('updates.upToDate')}
            </p>
            <p {...sx(styles.copy)}>
              {t('updates.upToDateBody', { version: info.current })}
            </p>
            <div {...sx(styles.actions)} style={{ marginTop: 4 }}>
              <Button tone="ghost" onClick={() => setShowNotes(v => !v)}>
                {showNotes ? t('updates.hideNotes') : t('updates.whatsNew')}
                <ChevronDown
                  size={14}
                  strokeWidth={1.5}
                  {...sx(styles.chevron, showNotes && styles.chevronOpen)}
                />
              </Button>
            </div>
          </div>
        )
      ) : null}

      {showNotes || update.justUpdated ? (
        <ReleaseNotes releases={notes} />
      ) : null}
    </Surface>
  );
}
