import { Download } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import * as stylex from '@stylexjs/stylex';
import { Button } from '@/components/ui-system/Button';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT } from '@/i18n';
import { useCorrectionStatus } from './useCorrectionStatus';
import { BROWSER_MODEL_LABEL, BROWSER_MODEL_SIZE_MB } from './types';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: space.sm,
  },
  name: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
  },
  meta: {
    margin: 0,
    marginTop: 2,
    color: color.muted,
    fontSize: 12,
    lineHeight: '18px',
  },
  bar: {
    marginTop: 8,
    height: 6,
    width: 180,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: color.iris,
  },
  ready: {
    margin: 0,
    color: color.sage,
    fontSize: 12,
    fontWeight: 600,
  },
});

export function BuiltinModelCard() {
  const t = useT();
  const status = useCorrectionStatus();
  const downloading = status.state === 'downloading';
  const preparing = status.state === 'loading' || status.state === 'checking';
  const ready = status.state === 'ready' || status.state === 'processing';
  const failed = status.state === 'error';
  const progress = Math.max(0, Math.min(100, status.progress ?? 0));

  const detail = downloading
    ? t('settings.modelDownloading', { pct: progress })
    : preparing
      ? t('settings.modelLoading')
      : failed
        ? t('settings.modelError')
        : ready
          ? t('settings.modelDownloaded')
          : t('settings.modelMissing');

  return (
    <div {...sx(styles.row)}>
      <div>
        <p {...sx(styles.name)}>{BROWSER_MODEL_LABEL}</p>
        <p {...sx(styles.meta)}>
          {t('settings.modelSize', { size: BROWSER_MODEL_SIZE_MB })} · {detail}
        </p>
        {downloading ? (
          <div {...sx(styles.bar)}>
            <div {...sx(styles.fill)} style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </div>
      {ready ? (
        <p {...sx(styles.ready)}>{t('settings.modelDownloaded')}</p>
      ) : (
        <Button
          tone="quiet"
          disabled={downloading || preparing}
          onClick={() => {
            void invoke('request_builtin_model_download').catch(
              () => undefined
            );
          }}
        >
          <Download size={14} strokeWidth={1.5} />
          {failed ? t('settings.modelRetry') : t('settings.modelDownload')}
        </Button>
      )}
    </div>
  );
}
