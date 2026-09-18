import { Keyboard, Shield, Zap } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey, hotkeyParts } from '@/lib/hotkey';
import { PipelineLogPanel } from '@/components/PipelineLog';
import { VoiceChamberLazy } from '@/components/scene/VoiceChamberLazy';
import { useDictationScene } from '@/hooks/useDictationScene';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { Chip } from '@/components/ui-system/Chip';
import { StatusDot } from '@/components/ui-system/StatusDot';
import { HotkeyKeys } from '@/components/ui-system/Kbd';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  hero: {
    display: 'grid',
    gap: space.lg,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1.4fr 1fr',
      '@media (max-width: 1080px)': '1fr',
    },
    gap: space.md,
  },
  trio: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      '@media (max-width: 860px)': '1fr',
    },
    gap: space.md,
  },
  kicker: {
    margin: 0,
    marginBottom: space.sm,
    color: color.copper,
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  copy: {
    margin: 0,
    color: color.muted,
    fontSize: '0.9rem',
    lineHeight: 1.55,
  },
  title: {
    margin: 0,
    marginBottom: space.xs,
    fontFamily: font.sans,
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
  },
  value: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    color: color.muted,
    fontSize: '0.8rem',
    margin: 0,
  },
});

export function DashboardPage() {
  const {
    selectedDevice,
    audioDevices,
    selectedLanguage,
    isLoading,
    runtimeStatus,
    config,
  } = useAppConfig();
  const { mode, level } = useDictationScene();
  const ready = Boolean(runtimeStatus?.dictation_ready);
  const deviceName =
    audioDevices.find(d => d.id === selectedDevice)?.name ?? 'Sin micrófono';
  const languageLabel =
    selectedLanguage === 'auto' ? 'Auto' : selectedLanguage.toUpperCase();
  const sttState = runtimeStatus?.stt_server.state ?? 'unknown';
  const llmState = runtimeStatus?.llm_server.state ?? 'idle';
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);
  const pttParts = hotkeyParts(config?.hotkeys.push_to_talk);

  if (isLoading) {
    return (
      <PageFrame>
        <p {...sx(styles.copy)}>Cargando el estado del dictado…</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeader
        title="Habla. El resto es local."
        lede="El atajo y el micrófono son de sistema: funcionan con Murmullo en segundo plano. La píldora abajo muestra el estado; esta ventana es la cámara."
        actions={
          <>
            <Chip tone={ready ? 'live' : 'copper'}>
              <StatusDot ready={ready} />
              {ready ? 'Parakeet listo' : 'STT no listo'}
            </Chip>
            <Chip>Overlay {ptt}</Chip>
          </>
        }
      />

      <div {...sx(styles.hero)}>
        <VoiceChamberLazy mode={mode} level={level} />
      </div>

      <div {...sx(styles.grid)}>
        <Surface>
          <p {...sx(styles.kicker)}>Cómo dictar</p>
          <p {...sx(styles.copy)}>
            Mantén el atajo, habla y suelta. Murmullo graba, manda el clip a
            nemo-speech en localhost y pega el texto en el campo activo.
          </p>
          <div {...sx(styles.row)}>
            <span>Hold-to-talk</span>
            <HotkeyKeys parts={pttParts} />
          </div>
          <div {...sx(styles.row)}>
            <Chip tone="danger">1. Grabación</Chip>
            <Chip tone="live">2. Parakeet</Chip>
            <Chip tone="copper">3. Pegado</Chip>
          </div>
        </Surface>

        <Surface>
          <p {...sx(styles.kicker)}>Runtime</p>
          <p {...sx(styles.title)}>Dictado</p>
          <p {...sx(styles.copy)}>nemo-speech + Parakeet Q8</p>
          <p {...sx(styles.value)}>{ready ? 'Listo' : 'Pendiente'}</p>
          <p {...sx(styles.title)}>Servidor STT</p>
          <p {...sx(styles.copy)}>
            {runtimeStatus?.stt_server.message ?? 'Sin estado'} ({sttState})
          </p>
          <p {...sx(styles.title)}>LLM local</p>
          <p {...sx(styles.copy)}>
            {runtimeStatus?.llm_server.message ?? 'Opcional'}
            {runtimeStatus?.llm_model ? ` (${runtimeStatus.llm_model})` : ''}
            {'. '}
            {llmState === 'running'
              ? 'En marcha'
              : llmState === 'stopped'
                ? 'Parado'
                : llmState === 'missing'
                  ? 'No instalado'
                  : llmState}
          </p>
        </Surface>
      </div>

      <div {...sx(styles.trio)}>
        <Surface>
          <p {...sx(styles.kicker)}>Micrófono</p>
          <p {...sx(styles.value)}>{deviceName}</p>
          <p {...sx(styles.copy)}>
            Cámbialo en Ajustes. El overlay usa este dispositivo al pulsar el
            atajo.
          </p>
        </Surface>
        <Surface>
          <p {...sx(styles.kicker)}>Idioma</p>
          <p {...sx(styles.value)}>{languageLabel}</p>
          <p {...sx(styles.copy)}>
            Auto detecta el idioma del clip. El diccionario se aplica después
            del STT.
          </p>
        </Surface>
        <Surface>
          <p {...sx(styles.kicker)}>Atajo global</p>
          <p {...sx(styles.value)}>{ptt}</p>
          <p {...sx(styles.copy)}>
            Hold-to-talk. El HUD muestra grabación y pegado; aquí ves el
            sistema.
          </p>
        </Surface>
      </div>

      <div {...sx(styles.trio)}>
        {[
          {
            icon: Zap,
            title: 'Píldora de estado',
            body: 'HUD en ventana aislada: waveform y estados de grabación, procesado y pegado.',
          },
          {
            icon: Keyboard,
            title: 'Pega en el cursor',
            body: 'Suelta el atajo y el texto entra en el campo activo de cualquier ventana.',
          },
          {
            icon: Shield,
            title: 'Nada sale del Mac',
            body: 'STT y diccionario en el dispositivo. El LLM es opcional y también local.',
          },
        ].map(card => (
          <Surface key={card.title}>
            <card.icon size={18} color="currentColor" />
            <p {...sx(styles.title)}>{card.title}</p>
            <p {...sx(styles.copy)}>{card.body}</p>
          </Surface>
        ))}
      </div>

      <p {...sx(styles.hint)}>
        Si no ves la píldora, mira el borde inferior de la pantalla: es otra
        ventana, no un widget del escritorio.
      </p>

      <PipelineLogPanel compact />
    </PageFrame>
  );
}
