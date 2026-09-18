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
import { BoothButton } from '@/components/ui-system/BoothButton';
import { Chip } from '@/components/ui-system/Chip';
import { color, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

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
    padding: space.md,
    borderRadius: radius.md,
  },
  ok: {
    backgroundColor: 'color-mix(in srgb, var(--booth-live) 16%, transparent)',
    color: color.live,
  },
  bad: {
    backgroundColor: 'color-mix(in srgb, var(--booth-danger) 16%, transparent)',
    color: color.danger,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.raised,
    marginBottom: space.sm,
    flexDirection: {
      default: 'row',
      '@media (max-width: 720px)': 'column',
    },
    alignItems: {
      default: 'center',
      '@media (max-width: 720px)': 'flex-start',
    },
  },
  copy: {
    margin: 0,
    color: color.muted,
    fontSize: '0.8rem',
    lineHeight: 1.5,
    maxWidth: '36rem',
  },
  title: {
    margin: 0,
    fontWeight: 600,
  },
  steps: {
    color: color.muted,
    fontSize: '0.85rem',
    lineHeight: 1.7,
    paddingLeft: space.lg,
  },
});

export function PermissionsPage() {
  const [status, setStatus] = useState<MacosPermissionStatus>(EMPTY_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setStatus(await permissionService.status());
      setError(null);
    } catch (cause) {
      setError(String(cause));
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
      setError(String(cause));
    } finally {
      setBusy(null);
      await loadPermissions();
    }
  };

  const permissions = [
    {
      key: 'microphone',
      label: 'Micrófono',
      description:
        'Captura de audio a nivel de sistema. Graba aunque Murmullo esté en segundo plano y otra app tenga el foco.',
      value: status.microphone,
      request: () =>
        request('microphone', () => permissionService.requestMicrophone()),
      icon: Mic,
    },
    {
      key: 'input_monitoring',
      label: 'Atajo global (Input Monitoring)',
      description:
        'El comando hold-to-talk se registra en macOS, no en esta ventana. Tiene que dispararse en Slack, Cursor o Notes igual que el micrófono.',
      value: status.input_monitoring,
      request: () =>
        request('input_monitoring', () =>
          permissionService.requestInputMonitoring()
        ),
      icon: Keyboard,
    },
    {
      key: 'accessibility',
      label: 'Accesibilidad',
      description:
        'Pega el texto transcrito en el campo activo de cualquier app. Sin esto, el dictado solo llega al portapapeles.',
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
        title="Permisos de sistema"
        lede="Micrófono, atajo y pegado son APIs de macOS. Murmullo no escucha teclas ni audio desde su propia UI."
        actions={
          <BoothButton
            tone="quiet"
            size="sm"
            onClick={() => void loadPermissions()}
          >
            <RefreshCw size={14} /> Actualizar
          </BoothButton>
        }
      />

      <div {...sx(styles.banner, allGranted ? styles.ok : styles.bad)}>
        {allGranted ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        {allGranted
          ? 'El dictado puede operar en segundo plano'
          : 'Faltan permisos de sistema para el comando global'}
      </div>

      {error ? <p {...sx(styles.copy)}>{error}</p> : null}

      {permissions.map(permission => {
        const Icon = permission.icon;
        return (
          <div key={permission.key} {...sx(styles.row)}>
            <div>
              <p {...sx(styles.title)}>
                <Icon size={14} aria-hidden /> {permission.label}
              </p>
              <p {...sx(styles.copy)}>{permission.description}</p>
            </div>
            <div>
              <Chip tone={permission.value ? 'live' : 'danger'}>
                {permission.value ? 'Concedido' : 'Necesario'}
              </Chip>
              {permission.value ? null : (
                <BoothButton
                  size="sm"
                  onClick={() => void permission.request()}
                  disabled={busy !== null}
                >
                  {busy === permission.key ? 'Pidiendo…' : 'Conceder'}
                </BoothButton>
              )}
            </div>
          </div>
        );
      })}

      <Surface>
        <p {...sx(styles.title)}>
          <Shield size={14} aria-hidden /> Cómo concederlos
        </p>
        <ol {...sx(styles.steps)}>
          <li>Ajustes del Sistema, Privacidad y seguridad</li>
          <li>Micrófono, Monitorización de entrada y Accesibilidad</li>
          <li>Activa Murmullo (o el binario de `tauri dev`)</li>
          <li>Vuelve aquí: el estado se actualiza solo</li>
        </ol>
      </Surface>
    </PageFrame>
  );
}
