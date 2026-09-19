import { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Mic,
  Keyboard,
  Settings,
  RefreshCw,
} from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { permissionService } from '@/services/tauri';
import type { MacosPermissionStatus } from '@/types';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { Button } from '@/components/ui-system/Button';
import { Chip } from '@/components/ui-system/Chip';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT, mapBackendError } from '@/i18n';

const EMPTY_STATUS: MacosPermissionStatus = {
  microphone: false,
  accessibility: false,
  input_monitoring: false,
};

const styles = stylex.create({
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: 14,
    paddingInline: 16,
    borderRadius: 20,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 500,
  },
  ok: {
    backgroundColor: 'color-mix(in srgb, var(--color-sage) 16%, transparent)',
    color: color.sage,
  },
  bad: {
    backgroundColor: 'color-mix(in srgb, var(--color-blush) 16%, transparent)',
    color: color.danger,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: space.md,
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    flexDirection: {
      default: 'row',
      '@media (max-width: 960px)': 'column',
    },
    alignItems: {
      default: 'center',
      '@media (max-width: 960px)': 'flex-start',
    },
  },
  rowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
  },
  copy: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '18px',
    maxWidth: '36rem',
  },
  title: {
    margin: 0,
    marginBottom: 4,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  steps: {
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 1.7,
    paddingLeft: space.lg,
  },
});

export function PermissionsPage() {
  const t = useT();
  const [status, setStatus] = useState<MacosPermissionStatus>(EMPTY_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setStatus(await permissionService.status());
      setError(null);
    } catch (cause) {
      setError(mapBackendError(cause));
    }
  }, []);

  useEffect(() => {
    loadPermissions().catch(() => undefined);
    const id = window.setInterval(() => {
      loadPermissions().catch(() => undefined);
    }, 2000);
    const onFocus = () => {
      loadPermissions().catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadPermissions]);

  const request = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    try {
      await fn();
      await loadPermissions();
    } catch (cause) {
      setError(mapBackendError(cause));
    } finally {
      setBusy(null);
      await loadPermissions();
    }
  };

  const permissions = [
    {
      key: 'microphone',
      label: t('permissions.mic'),
      description: t('permissions.micBody'),
      value: status.microphone,
      request: () =>
        request('microphone', () => permissionService.requestMicrophone()),
      icon: Mic,
    },
    {
      key: 'input_monitoring',
      label: t('permissions.hotkey'),
      description: t('permissions.hotkeyBody'),
      value: status.input_monitoring,
      request: () =>
        request('input_monitoring', () =>
          permissionService.requestInputMonitoring()
        ),
      icon: Keyboard,
    },
    {
      key: 'accessibility',
      label: t('permissions.accessibility'),
      description: t('permissions.accessibilityBody'),
      value: status.accessibility,
      request: () =>
        request('accessibility', () =>
          permissionService.requestAccessibility()
        ),
      icon: Settings,
    },
  ];

  const allGranted = permissions.every(p => p.value);

  return (
    <PageFrame>
      <PageHeader
        title={t('permissions.title')}
        lede={t('permissions.lede')}
        actions={
          <Button tone="quiet" size="sm" onClick={() => void loadPermissions()}>
            <RefreshCw size={14} strokeWidth={1.5} /> {t('permissions.refresh')}
          </Button>
        }
      />

      <div {...sx(styles.banner, allGranted ? styles.ok : styles.bad)}>
        {allGranted ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        {allGranted ? t('permissions.bannerOk') : t('permissions.bannerBad')}
      </div>

      {error ? <p {...sx(styles.copy)}>{error}</p> : null}

      <div {...sx(styles.stack)}>
        {permissions.map(permission => {
          const Icon = permission.icon;
          return (
            <div key={permission.key} {...sx(styles.row)}>
              <div>
                <p {...sx(styles.title)}>
                  <Icon size={16} strokeWidth={1.5} aria-hidden />{' '}
                  {permission.label}
                </p>
                <p {...sx(styles.copy)}>{permission.description}</p>
              </div>
              <div {...sx(styles.rowActions)}>
                <Chip tone={permission.value ? 'live' : 'danger'}>
                  {permission.value
                    ? t('permissions.granted')
                    : t('permissions.needed')}
                </Chip>
                {permission.value ? null : (
                  <Button
                    size="sm"
                    onClick={() => void permission.request()}
                    disabled={busy !== null}
                  >
                    {busy === permission.key
                      ? t('permissions.asking')
                      : t('permissions.grant')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Surface>
        <p {...sx(styles.title)}>
          <Shield size={16} strokeWidth={1.5} aria-hidden />{' '}
          {t('permissions.howTitle')}
        </p>
        <ol {...sx(styles.steps)}>
          <li>{t('permissions.step1')}</li>
          <li>{t('permissions.step2')}</li>
          <li>{t('permissions.step3')}</li>
          <li>{t('permissions.step4')}</li>
        </ol>
      </Surface>
    </PageFrame>
  );
}
