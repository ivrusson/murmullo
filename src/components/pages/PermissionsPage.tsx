import { useCallback, useEffect, useState } from 'react';
import { Container, Section, Flex } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import { Heading, Text, Icon } from '@/components/ui';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Mic,
  Keyboard,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { permissionService } from '@/services/tauri';
import type { MacosPermissionStatus } from '@/types';

const EMPTY_STATUS: MacosPermissionStatus = {
  microphone: false,
  accessibility: false,
  input_monitoring: false,
};

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
    <div className="min-h-full px-6 py-6">
      <Container size="lg" padding="sm">
        <Section spacing="md">
          <Flex direction="column" gap="xs" className="mb-4">
            <Flex align="center" gap="sm">
              <Icon icon={Shield} size="lg" color="primary" />
              <Heading level={1} size="xl" className="font-semibold">
                Permisos de sistema
              </Heading>
            </Flex>
            <Text color="muted" size="sm" className="font-light">
              Micrófono, atajo y pegado son APIs de macOS. Murmullo no escucha
              teclas ni audio desde su propia UI.
            </Text>
          </Flex>

          <div className="mb-4">
            <Button
              onClick={() => loadPermissions()}
              size="sm"
              variant="outline"
              className="text-xs px-3 py-1"
            >
              <Icon icon={RefreshCw} size="sm" />
              Actualizar
            </Button>
          </div>

          <div className="mb-4">
            <div
              className={`p-3 rounded-lg ${allGranted ? 'bg-success/10' : 'bg-destructive/10'}`}
            >
              <Flex align="center" gap="sm">
                <Icon
                  icon={allGranted ? CheckCircle : AlertCircle}
                  size="sm"
                  color={allGranted ? 'success' : 'destructive'}
                />
                <Text
                  weight="medium"
                  className={`text-sm ${allGranted ? 'text-success' : 'text-destructive'}`}
                >
                  {allGranted
                    ? 'El dictado puede operar en segundo plano'
                    : 'Faltan permisos de sistema para el comando global'}
                </Text>
              </Flex>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10">
              <Text size="xs" className="text-destructive break-all">
                {error}
              </Text>
            </div>
          )}

          <div className="space-y-2">
            {permissions.map(permission => (
              <div
                key={permission.key}
                className="flex justify-between items-center py-3 px-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors"
              >
                <Flex align="center" gap="sm">
                  <Icon icon={permission.icon} size="sm" color="primary" />
                  <Flex direction="column" gap="xs">
                    <Text weight="medium" className="text-foreground text-sm">
                      {permission.label}
                    </Text>
                    <Text
                      size="xs"
                      color="muted"
                      className="font-light max-w-xl"
                    >
                      {permission.description}
                    </Text>
                  </Flex>
                </Flex>
                <Flex align="center" gap="md">
                  <Badge
                    variant={permission.value ? 'secondary' : 'destructive'}
                    className={
                      permission.value
                        ? 'bg-success/10 text-success border-success/20 text-xs'
                        : 'bg-destructive/10 text-destructive border-destructive/20 text-xs'
                    }
                  >
                    {permission.value ? 'Concedido' : 'Necesario'}
                  </Badge>
                  {!permission.value && (
                    <Button
                      onClick={permission.request}
                      size="sm"
                      disabled={busy !== null}
                      className="text-xs px-4 py-1"
                    >
                      {busy === permission.key ? '…' : 'Conceder'}
                    </Button>
                  )}
                </Flex>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Flex align="center" gap="sm" className="mb-3">
              <Icon icon={AlertCircle} size="sm" color="primary" />
              <Text weight="medium" className="text-foreground text-sm">
                Cómo concederlos
              </Text>
            </Flex>
            <div className="space-y-1 text-xs text-muted-foreground font-light pl-6">
              <div>1. Ajustes del Sistema → Privacidad y seguridad</div>
              <div>2. Micrófono, Monitorización de entrada y Accesibilidad</div>
              <div>3. Activa Murmullo (o el binario de `tauri dev`)</div>
              <div>4. Vuelve aquí: el estado se actualiza solo</div>
            </div>
          </div>
        </Section>
      </Container>
    </div>
  );
}
