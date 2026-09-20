import { useEffect, useState, type ReactNode } from 'react';
import { Download, Play, Square, Shield, RotateCcw } from 'lucide-react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { permissionService, runtimeService } from '@/services/tauri';
import type { ComponentStatus } from '@/types';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { PipelineLogPanel } from '@/components/PipelineLog';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { Button } from '@/components/ui-system/Button';
import { Chip } from '@/components/ui-system/Chip';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT, mapBackendError, translateBackendMessage } from '@/i18n';

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
  live: { color: color.sage },
  danger: { color: color.danger },
  iris: { color: color.iris },
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
    backgroundColor: color.iris,
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
        : styles.iris;
  return (
    <div {...sx(styles.row)}>
      <div>
        <p {...sx(styles.label)}>{label}</p>
        <p {...sx(styles.msg)}>{translateBackendMessage(status.message)}</p>
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

function providerLabel(id: string): string {
  switch (id) {
    case 'kimi':
      return 'Kimi';
    case 'kilo':
    case 'kili':
      return 'Kilo';
    case 'cursor':
      return 'Cursor';
    case 'claude':
      return 'Claude';
    default:
      return 'Ollama';
  }
}

export function RuntimePage() {
  const t = useT();
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
      toast.error(mapBackendError(error));
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
      toast.success(t('runtime.readyToast'));
    } catch (error) {
      toast.error(mapBackendError(error));
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
  const llmIsServer = (status?.llm_kind ?? 'server') === 'server';
  const llmProviderLabel = providerLabel(
    status?.llm_provider ?? config?.runtime.llm_provider ?? 'ollama'
  );
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
      <PageHeader title={t('runtime.title')} lede={t('runtime.lede')} />

      <div {...sx(styles.stack)}>
        {needsInstall ? (
          <Surface>
            <p {...sx(styles.label)}>{t('runtime.autoInstall')}</p>
            <p {...sx(styles.copy)}>{t('runtime.autoInstallBody')}</p>
            {cliBusy && status ? (
              <div>
                {status.stt_binary.state === 'downloading' ? (
                  <StatusRow
                    label={t('runtime.cli')}
                    status={status.stt_binary}
                  />
                ) : null}
                {status.stt_model.state === 'downloading' ? (
                  <StatusRow
                    label={t('runtime.model')}
                    status={status.stt_model}
                  />
                ) : null}
              </div>
            ) : null}
            <div {...sx(styles.actions)}>
              <Button
                disabled={busy !== null}
                onClick={() => void installAndStart()}
              >
                <Download size={14} strokeWidth={1.5} />
                {busy === 'install'
                  ? t('runtime.installing')
                  : t('runtime.installStart')}
              </Button>
              {installError ? (
                <Button
                  tone="quiet"
                  disabled={busy !== null}
                  onClick={() => void installAndStart()}
                >
                  <RotateCcw size={14} strokeWidth={1.5} /> {t('runtime.retry')}
                </Button>
              ) : null}
            </div>
          </Surface>
        ) : null}

        <Step n={1} title={t('runtime.stepPerms')} done={permsDone}>
          <p {...sx(styles.copy)}>{t('runtime.stepPermsBody')}</p>
          <p {...sx(styles.copy)}>
            <Shield size={12} />{' '}
            {t('runtime.permsLine', {
              mic: micOk ? t('common.ok') : t('common.pending'),
              hotkey: hotkeyOk ? t('common.ok') : t('common.pending'),
              paste: accessOk ? t('common.ok') : t('common.pending'),
            })}
          </p>
        </Step>

        <Step n={2} title={t('runtime.stepCli')} done={!!cliReady}>
          <p {...sx(styles.copy)}>{t('runtime.stepCliBody')}</p>
          {status ? (
            <StatusRow label={t('runtime.binary')} status={status.stt_binary} />
          ) : null}
          {cliReady ? null : (
            <Button
              disabled={busy !== null}
              onClick={() => void installAndStart()}
            >
              <Download size={14} strokeWidth={1.5} /> {t('runtime.installCli')}
            </Button>
          )}
        </Step>

        <Step n={3} title={t('runtime.stepModel')} done={!!modelReady}>
          {status ? (
            <StatusRow label={t('runtime.gguf')} status={status.stt_model} />
          ) : null}
          {modelReady ? null : (
            <Button
              disabled={busy !== null}
              onClick={() => void installAndStart()}
            >
              <Download size={14} strokeWidth={1.5} />{' '}
              {t('runtime.downloadModel')}
            </Button>
          )}
        </Step>

        <Step n={4} title={t('runtime.stepStt')} done={!!sttReady}>
          <p {...sx(styles.copy)}>{t('runtime.stepSttBody')}</p>
          {status ? (
            <StatusRow
              label={t('runtime.sttServe')}
              status={status.stt_server}
            />
          ) : null}
          <div {...sx(styles.actions)}>
            <Button
              disabled={busy !== null || !modelReady || !cliReady}
              onClick={() =>
                void run(t('runtime.sttReady'), () => runtimeService.startStt())
              }
            >
              <Play size={14} strokeWidth={1.5} /> {t('runtime.startStt')}
            </Button>
            <Button
              tone="quiet"
              disabled={busy !== null}
              onClick={() =>
                void run(t('runtime.sttStopped'), () =>
                  runtimeService.stopStt()
                )
              }
            >
              <Square size={14} strokeWidth={1.5} /> {t('runtime.stop')}
            </Button>
          </div>
        </Step>

        <Step
          n={5}
          title={t('runtime.stepLlm', { provider: llmProviderLabel })}
          done={!!llmReady}
        >
          <p {...sx(styles.copy)}>
            {llmIsServer
              ? t('runtime.llmServerBody')
              : t('runtime.llmCliBody', { provider: llmProviderLabel })}
          </p>
          {status ? (
            <>
              <StatusRow
                label={
                  llmIsServer
                    ? t('runtime.ollamaCli')
                    : t('runtime.cliProvider', { provider: llmProviderLabel })
                }
                status={status.llm_binary}
              />
              <StatusRow
                label={
                  llmIsServer ? t('runtime.llmServer') : t('runtime.llmBackend')
                }
                status={status.llm_server}
              />
              <StatusRow
                label={t('runtime.llmModel')}
                status={
                  status.llm_model_status ?? {
                    state: 'missing',
                    message: t('runtime.noData'),
                    progress: null,
                  }
                }
              />
            </>
          ) : null}
          {llmStopped && llmIsServer ? (
            <Button
              disabled={busy !== null}
              onClick={() =>
                void run(t('runtime.llmStarted'), () =>
                  runtimeService.startLlm()
                )
              }
            >
              <Play size={14} strokeWidth={1.5} /> {t('runtime.startOllama')}
            </Button>
          ) : null}
          {!llmInstalled && !llmReady ? (
            <p {...sx(styles.copy)}>
              {t('runtime.llmMissing', { provider: llmProviderLabel })}
            </p>
          ) : null}
          {llmReady && status?.llm_model_status?.state !== 'ready' ? (
            <p {...sx(styles.copy)}>{t('runtime.llmModelMissing')}</p>
          ) : null}
        </Step>

        {status?.dictation_ready ? (
          <Chip tone="live">{t('runtime.readyChip', { ptt })}</Chip>
        ) : null}

        <PipelineLogPanel />
      </div>
    </PageFrame>
  );
}
