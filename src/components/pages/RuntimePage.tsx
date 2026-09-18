import { useEffect, useState, type ReactNode } from 'react';
import { Download, Play, Square, Shield, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import * as stylex from '@stylexjs/stylex';
import { permissionService, runtimeService } from '@/services/tauri';
import type { ComponentStatus } from '@/types';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { PipelineLogPanel } from '@/components/PipelineLog';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { BoothButton } from '@/components/ui-system/BoothButton';
import { Chip } from '@/components/ui-system/Chip';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  copy: {
    margin: 0,
    color: color.muted,
    fontSize: '0.85rem',
    lineHeight: 1.5,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: space.sm,
    borderBottomColor: color.line,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  label: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  msg: {
    margin: 0,
    color: color.muted,
    fontSize: '0.75rem',
    wordBreak: 'break-all',
  },
  state: {
    fontFamily: font.mono,
    fontSize: '0.7rem',
    color: color.muted,
    alignSelf: 'flex-start',
  },
  live: { color: color.live },
  danger: { color: color.danger },
  copper: { color: color.copper },
  bar: {
    marginTop: 6,
    height: 6,
    width: 160,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: color.copper,
  },
  stepHead: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  n: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    backgroundColor: color.raised,
    color: color.muted,
  },
  nDone: {
    backgroundColor: color.live,
    color: color.liveInk,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
});

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: ComponentStatus;
}) {
  const tone =
    status.state === 'running' || status.state === 'ready'
      ? styles.live
      : status.state === 'error'
        ? styles.danger
        : styles.copper;
  return (
    <div {...sx(styles.row)}>
      <div>
        <p {...sx(styles.label)}>{label}</p>
        <p {...sx(styles.msg)}>{status.message}</p>
        {status.progress != null ? (
          <div {...sx(styles.bar)}>
            <div
              {...sx(styles.fill)}
              style={{ width: `${Math.min(status.progress, 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <span {...sx(styles.state, tone)}>{status.state}</span>
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
    <Surface>
      <div {...sx(styles.stepHead)}>
        <span {...sx(styles.n, done ? styles.nDone : false)}>{n}</span>
        <p {...sx(styles.label)}>{title}</p>
      </div>
      {children}
    </Surface>
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
    <PageFrame>
      <PageHeader
        title="Runtimes"
        lede="Primera ejecución: Murmullo descarga nemo-speech y Parakeet Q8, luego arranca el STT en localhost. El LLM es opcional; el dictado funciona sin él."
      />

      <div {...sx(styles.stack)}>
        {needsInstall ? (
          <Surface>
            <p {...sx(styles.label)}>Instalación automática</p>
            <p {...sx(styles.copy)}>
              Un clic descarga el CLI oficial de NVIDIA (con SHA-256), el modelo
              Parakeet Q8 (~714 MB) y arranca el servidor STT.
            </p>
            {cliBusy && status ? (
              <div>
                {status.stt_binary.state === 'downloading' ? (
                  <StatusRow label="CLI" status={status.stt_binary} />
                ) : null}
                {status.stt_model.state === 'downloading' ? (
                  <StatusRow label="Modelo" status={status.stt_model} />
                ) : null}
              </div>
            ) : null}
            <div {...sx(styles.actions)}>
              <BoothButton
                disabled={busy !== null}
                onClick={() => void installAndStart()}
              >
                <Download size={14} />
                {busy === 'install' ? 'Instalando…' : 'Instalar y arrancar'}
              </BoothButton>
              {installError ? (
                <BoothButton
                  tone="quiet"
                  disabled={busy !== null}
                  onClick={() => void installAndStart()}
                >
                  <RotateCcw size={14} /> Reintentar
                </BoothButton>
              ) : null}
            </div>
          </Surface>
        ) : null}

        <Step
          n={1}
          title="Permisos de sistema (mic, atajo, pegado)"
          done={permsDone}
        >
          <p {...sx(styles.copy)}>
            El atajo se registra en macOS, igual que el micrófono. Sin
            monitorización de entrada el comando no llega si otra app tiene el
            foco. Sin accesibilidad el texto no se pega.
          </p>
          <p {...sx(styles.copy)}>
            <Shield size={12} /> Mic: {micOk ? 'ok' : 'pendiente'} · Atajo:{' '}
            {hotkeyOk ? 'ok' : 'pendiente'} · Pegado:{' '}
            {accessOk ? 'ok' : 'pendiente'}. Concédelos en Permisos.
          </p>
        </Step>

        <Step n={2} title="CLI nemo-speech" done={!!cliReady}>
          <p {...sx(styles.copy)}>
            Se instala en Application Support de Murmullo. También se detecta si
            ya está en PATH, NEMO_SPEECH_BIN, Homebrew o la instalación oficial
            de NVIDIA.
          </p>
          {status ? (
            <StatusRow label="Binario" status={status.stt_binary} />
          ) : null}
          {cliReady ? null : (
            <BoothButton
              disabled={busy !== null}
              onClick={() => void installAndStart()}
            >
              <Download size={14} /> Instalar CLI
            </BoothButton>
          )}
        </Step>

        <Step n={3} title="Modelo Parakeet Q8 (~714 MB)" done={!!modelReady}>
          {status ? <StatusRow label="GGUF" status={status.stt_model} /> : null}
          {modelReady ? null : (
            <BoothButton
              disabled={busy !== null}
              onClick={() => void installAndStart()}
            >
              <Download size={14} /> Descargar modelo
            </BoothButton>
          )}
        </Step>

        <Step n={4} title="Servidor STT en localhost:18765" done={!!sttReady}>
          <p {...sx(styles.copy)}>
            Cada dictado hace POST a /v1/audio/transcriptions (API compatible
            OpenAI). stdout/stderr de nemo-speech se reenvían al panel de logs.
          </p>
          {status ? (
            <StatusRow label="nemo-speech serve" status={status.stt_server} />
          ) : null}
          <div {...sx(styles.actions)}>
            <BoothButton
              disabled={busy !== null || !modelReady || !cliReady}
              onClick={() => void run('STT listo', () => runtimeService.startStt())}
            >
              <Play size={14} /> Arrancar STT
            </BoothButton>
            <BoothButton
              tone="quiet"
              disabled={busy !== null}
              onClick={() => void run('STT parado', () => runtimeService.stopStt())}
            >
              <Square size={14} /> Parar
            </BoothButton>
          </div>
        </Step>

        <Step n={5} title="LLM local (opcional)" done={!!llmReady}>
          <p {...sx(styles.copy)}>
            Se detecta Ollama en PATH, Homebrew, /usr/local/bin y Ollama.app. Si
            no está, se pega el STT + diccionario.
          </p>
          {status ? (
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
          ) : null}
          {llmStopped ? (
            <BoothButton
              disabled={busy !== null}
              onClick={() =>
                void run('LLM arrancado', () => runtimeService.startLlm())
              }
            >
              <Play size={14} /> Arrancar Ollama
            </BoothButton>
          ) : null}
          {!llmInstalled && !llmReady ? (
            <p {...sx(styles.copy)}>
              Ollama no está en este Mac. Es opcional: el dictado ya funciona
              con STT + diccionario.
            </p>
          ) : null}
          {llmReady && status?.llm_model_status?.state !== 'ready' ? (
            <p {...sx(styles.copy)}>
              Servidor detectado. El modelo configurado no está descargado; el
              dictado sigue sin reescritura LLM.
            </p>
          ) : null}
        </Step>

        {status?.dictation_ready ? (
          <Chip tone="live">
            Dictado listo. Mantén {ptt}, habla y suelta.
          </Chip>
        ) : null}

        <PipelineLogPanel />
      </div>
    </PageFrame>
  );
}
