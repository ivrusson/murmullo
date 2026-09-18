import { useEffect, useState, type ReactNode } from 'react';
import { Container, Section, Flex } from '@/components/layout';
import { Button, Heading, Text } from '@/components/ui';
import { Cpu, Download, Play, Square, Shield, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { permissionService, runtimeService } from '@/services/tauri';
import type { ComponentStatus } from '@/types';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { PipelineLogPanel } from '@/components/PipelineLog';

function statusColor(state: string) {
  if (state === 'running' || state === 'ready') return 'text-cyan';
  if (state === 'error') return 'text-destructive';
  return 'text-amber';
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: ComponentStatus;
}) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <Text weight="medium" size="sm">
          {label}
        </Text>
        <Text size="xs" color="muted" className="font-light break-all">
          {status.message}
        </Text>
        {status.progress != null && (
          <div className="mt-1 h-1.5 w-40 rounded bg-muted overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(status.progress, 100)}%` }}
            />
          </div>
        )}
      </div>
      <Text
        size="xs"
        className={`uppercase tracking-wide shrink-0 ${statusColor(status.state)}`}
      >
        {status.state}
      </Text>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <div className="vf-card p-4 mb-3">
      <Flex align="center" gap="sm" className="mb-2">
        <span
          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${done ? 'bg-cyan text-cyan-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {n}
        </span>
        <Text weight="medium" size="sm">
          {title}
        </Text>
      </Flex>
      {children}
    </div>
  );
}

export function RuntimePage() {
  const { runtimeStatus: status, refreshRuntime, config } = useAppConfig();
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);
  const [busy, setBusy] = useState<string | null>(null);
  const [micOk, setMicOk] = useState(false);
  const [accessOk, setAccessOk] = useState(false);
  const [hotkeyOk, setHotkeyOk] = useState(false);

  const refreshPermissions = async () => {
    try {
      const next = await permissionService.status();
      setMicOk(next.microphone);
      setAccessOk(next.accessibility);
      setHotkeyOk(next.input_monitoring);
    } catch {
      // Browser / non-macOS preview: leave as not granted.
    }
  };

  useEffect(() => {
    refreshPermissions().catch(() => undefined);
    const id = setInterval(
      () => refreshPermissions().catch(() => undefined),
      4000
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => refreshRuntime().catch(() => undefined), 500);
    return () => clearInterval(id);
  }, [busy, refreshRuntime]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      setBusy(label);
      await fn();
      await refreshRuntime();
      toast.success(label);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(null);
      await refreshRuntime();
    }
  };

  const installAndStart = async () => {
    setBusy('install');
    try {
      await runtimeService.ensureStt();
      await refreshRuntime();
      toast.success('Dictado listo');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(null);
      await refreshRuntime();
    }
  };

  const cliReady = status?.stt_binary.state === 'ready';
  const modelReady = status?.stt_model.state === 'ready';
  const sttReady = status?.stt_server.state === 'running';
  const llmReady = status?.llm_server.state === 'running';
  const llmInstalled =
    status?.llm_binary.state === 'ready' ||
    status?.llm_server.state === 'stopped';
  const llmStopped = status?.llm_server.state === 'stopped';
  const cliBusy =
    status?.stt_binary.state === 'downloading' ||
    status?.stt_model.state === 'downloading';
  const installError =
    status?.stt_binary.state === 'error' ||
    status?.stt_server.state === 'error';
  const needsInstall = !status?.dictation_ready;
  const permsDone = micOk && accessOk && hotkeyOk;

  return (
    <div className="min-h-full px-6 py-6">
      <Container size="lg" padding="none">
        <Section spacing="md">
          <Flex align="center" gap="sm" className="mb-6">
            <Cpu size={22} className="text-primary" />
            <Heading level={1} size="xl">
              Runtimes
            </Heading>
          </Flex>
          <Text size="sm" color="muted" className="mb-6 font-light">
            Primera ejecución: Murmullo descarga nemo-speech y Parakeet Q8,
            luego arranca el STT en localhost. El LLM es opcional; el dictado
            funciona sin él.
          </Text>

          {needsInstall && (
            <div className="vf-card p-5 mb-5">
              <Text weight="medium" size="sm" className="mb-1">
                Instalación automática
              </Text>
              <Text size="xs" color="muted" className="font-light mb-3">
                Un clic descarga el CLI oficial de NVIDIA (con SHA-256), el
                modelo Parakeet Q8 (~714 MB) y arranca el servidor STT. No hace
                falta ir a GitHub.
              </Text>
              {cliBusy && status && (
                <div className="mb-3 space-y-1">
                  {status.stt_binary.state === 'downloading' && (
                    <StatusRow label="CLI" status={status.stt_binary} />
                  )}
                  {status.stt_model.state === 'downloading' && (
                    <StatusRow label="Modelo" status={status.stt_model} />
                  )}
                </div>
              )}
              <Flex gap="sm">
                <Button disabled={busy !== null} onClick={installAndStart}>
                  <Download size={14} />
                  {busy === 'install' ? 'Instalando…' : 'Instalar y arrancar'}
                </Button>
                {installError && (
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={installAndStart}
                  >
                    <RotateCcw size={14} /> Reintentar
                  </Button>
                )}
              </Flex>
            </div>
          )}

          <Step
            n={1}
            title="Permisos de sistema (mic, atajo, pegado)"
            done={permsDone}
          >
            <Text size="xs" color="muted" className="font-light mb-2">
              El atajo se registra en macOS, igual que el micrófono. Sin
              monitorización de entrada el comando no llega si otra app tiene el
              foco. Sin accesibilidad el texto no se pega.
            </Text>
            <Text
              size="xs"
              color="muted"
              className="font-light flex items-center gap-1"
            >
              <Shield size={12} />
              Mic: {micOk ? 'ok' : 'pendiente'} · Atajo:{' '}
              {hotkeyOk ? 'ok' : 'pendiente'} · Pegado:{' '}
              {accessOk ? 'ok' : 'pendiente'}. Concédelos en Permisos.
            </Text>
          </Step>

          <Step n={2} title="CLI nemo-speech" done={!!cliReady}>
            <Text size="xs" color="muted" className="font-light mb-2">
              Se instala en Application Support de Murmullo. También se detecta
              si ya está en PATH, NEMO_SPEECH_BIN, Homebrew o la instalación
              oficial de NVIDIA.
            </Text>
            {status && <StatusRow label="Binario" status={status.stt_binary} />}
            {!cliReady && (
              <Button
                className="mt-2"
                disabled={busy !== null}
                onClick={installAndStart}
              >
                <Download size={14} /> Instalar CLI
              </Button>
            )}
          </Step>

          <Step n={3} title="Modelo Parakeet Q8 (~714 MB)" done={!!modelReady}>
            {status && <StatusRow label="GGUF" status={status.stt_model} />}
            {!modelReady && (
              <Button
                className="mt-2"
                disabled={busy !== null}
                onClick={installAndStart}
              >
                <Download size={14} /> Descargar modelo
              </Button>
            )}
          </Step>

          <Step n={4} title="Servidor STT en localhost:18765" done={!!sttReady}>
            <Text size="xs" color="muted" className="font-light mb-2">
              Cada dictado hace POST a /v1/audio/transcriptions (API compatible
              OpenAI). stdout/stderr de nemo-speech se reenvían al panel de
              logs.
            </Text>
            {status && (
              <StatusRow label="nemo-speech serve" status={status.stt_server} />
            )}
            <Flex gap="sm" className="mt-2">
              <Button
                disabled={busy !== null || !modelReady || !cliReady}
                onClick={() =>
                  run('STT listo', () => runtimeService.startStt())
                }
              >
                <Play size={14} /> Arrancar STT
              </Button>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() =>
                  run('STT parado', () => runtimeService.stopStt())
                }
              >
                <Square size={14} /> Parar
              </Button>
            </Flex>
          </Step>

          <Step n={5} title="LLM local (opcional)" done={!!llmReady}>
            <Text size="xs" color="muted" className="font-light mb-2">
              Se detecta Ollama en PATH, Homebrew, /usr/local/bin y Ollama.app,
              y se sonda
              {status
                ? ` ${status.llm_server.state === 'running' ? status.llm_server.message : 'http://127.0.0.1:11434'}`
                : ' http://127.0.0.1:11434'}
              . Si no está, se pega el STT + diccionario.
            </Text>
            {status && (
              <>
                <StatusRow label="Ollama CLI" status={status.llm_binary} />
                <StatusRow label="Servidor LLM" status={status.llm_server} />
                <StatusRow
                  label="Modelo LLM"
                  status={
                    status.llm_model_status ?? {
                      state: 'missing',
                      message: 'Sin datos',
                      progress: null,
                    }
                  }
                />
              </>
            )}
            {llmStopped && (
              <Button
                className="mt-2"
                disabled={busy !== null}
                onClick={() =>
                  run('LLM arrancado', () => runtimeService.startLlm())
                }
              >
                <Play size={14} /> Arrancar Ollama
              </Button>
            )}
            {!llmInstalled && !llmReady && (
              <Text size="xs" color="muted" className="font-light mt-2">
                Ollama no está en este Mac. Es opcional: el dictado ya funciona
                con STT + diccionario.
              </Text>
            )}
            {llmReady && status?.llm_model_status?.state !== 'ready' && (
              <Text size="xs" color="muted" className="font-light mt-2">
                Servidor detectado. El modelo configurado no está descargado; el
                dictado sigue sin reescritura LLM.
              </Text>
            )}
          </Step>

          {status?.dictation_ready && (
            <Text size="sm" className="text-cyan mt-4">
              Dictado listo. Mantén {ptt}, habla y suelta. El POST va a{' '}
              {status.stt_server.message || 'http://127.0.0.1:18765'}
              /v1/audio/transcriptions.
            </Text>
          )}
        </Section>
        <div className="mt-4">
          <PipelineLogPanel />
        </div>
      </Container>
    </div>
  );
}
