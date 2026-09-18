import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as stylex from '@stylexjs/stylex';
import { configService } from '@/services/tauri';
import { GlobalSelectors } from '@/components/GlobalSelectors';
import { HotkeyRecorder } from '@/components/HotkeyRecorder';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { validateHotkey } from '@/lib/hotkey';
import type { AppConfig } from '@/types';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { BoothButton } from '@/components/ui-system/BoothButton';
import { color, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr 1fr',
      '@media (max-width: 1080px)': '1fr',
    },
    gap: space.md,
  },
  kicker: {
    margin: 0,
    marginBottom: space.md,
    color: color.copper,
    fontSize: '0.8rem',
  },
  copy: {
    margin: 0,
    color: color.muted,
    fontSize: '0.85rem',
    lineHeight: 1.5,
  },
  error: {
    color: color.danger,
    fontSize: '0.8rem',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.raised,
    cursor: 'pointer',
    marginBottom: space.sm,
  },
  label: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 600,
  },
});

export function SettingsPage() {
  const { refreshConfig } = useAppConfig();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setConfig(await configService.getConfig());
    } catch {
      toast.error('No se pudieron cargar los ajustes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    const hotkeyProblem = validateHotkey(
      config.hotkeys.push_to_talk,
      config.hotkeys.toggle_recording ? [config.hotkeys.toggle_recording] : []
    );
    if (hotkeyProblem) {
      setHotkeyError(hotkeyProblem);
      toast.error(hotkeyProblem);
      return;
    }
    try {
      await Promise.all([
        configService.updateAudioConfig(
          config.audio.noise_reduction,
          config.audio.normalization,
          config.audio.silence_threshold
        ),
        configService.updateRuntimeConfig(
          config.runtime.llm_enabled,
          config.runtime.llm_model,
          config.runtime.default_language
        ),
        configService.updateHotkeyConfig(
          config.hotkeys.push_to_talk,
          config.hotkeys.enabled
        ),
      ]);
      setHasChanges(false);
      setHotkeyError(null);
      await refreshConfig();
      toast.success('Ajustes guardados');
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'No se pudo guardar';
      setHotkeyError(message);
      toast.error(message);
    }
  };

  return (
    <PageFrame>
      <PageHeader
        title="Ajustes"
        lede="Apariencia, audio, atajos e inserción local."
        actions={
          <BoothButton
            onClick={() => void handleSave()}
            disabled={
              !hasChanges || isLoading || !config?.hotkeys.push_to_talk?.trim()
            }
          >
            Guardar
          </BoothButton>
        }
      />

      {isLoading ? (
        <div {...sx(styles.grid)}>
          <AppearanceCard />
          <Surface>
            <p {...sx(styles.copy)}>Cargando ajustes…</p>
          </Surface>
        </div>
      ) : !config ? (
        <div {...sx(styles.grid)}>
          <AppearanceCard />
          <Surface>
            <p {...sx(styles.copy)}>
              No se pudieron cargar los ajustes. Abre Murmullo como app de
              escritorio.
            </p>
          </Surface>
        </div>
      ) : (
        <div {...sx(styles.grid)}>
          <AppearanceCard />

          <Surface>
            <p {...sx(styles.kicker)}>Dispositivo de entrada</p>
            <GlobalSelectors />
          </Surface>

          <Surface>
            <p {...sx(styles.kicker)}>Atajos globales</p>
            <HotkeyRecorder
              value={config.hotkeys.push_to_talk}
              occupied={
                config.hotkeys.toggle_recording
                  ? [config.hotkeys.toggle_recording]
                  : []
              }
              onChange={async next => {
                await configService.updateHotkeyConfig(
                  next,
                  config.hotkeys.enabled
                );
                setHotkeyError(null);
                setConfig({
                  ...config,
                  hotkeys: { ...config.hotkeys, push_to_talk: next },
                });
                await refreshConfig();
                toast.success('Atajo actualizado');
              }}
            />
            {hotkeyError ? (
              <p {...sx(styles.error)}>{hotkeyError}</p>
            ) : null}
            <p {...sx(styles.copy)}>
              Mantén pulsado para dictar. El atajo nuevo se aplica al instante,
              sin reiniciar.
            </p>
          </Surface>

          <Surface>
            <p {...sx(styles.kicker)}>Cancelación y audio</p>
            <Toggle
              label="Reducción de ruido"
              description="Filtra el fondo antes del STT"
              checked={config.audio.noise_reduction}
              onChange={checked => {
                setConfig({
                  ...config,
                  audio: { ...config.audio, noise_reduction: checked },
                });
                setHasChanges(true);
              }}
            />
            <Toggle
              label="Normalización"
              description="Nivela el volumen del clip"
              checked={config.audio.normalization}
              onChange={checked => {
                setConfig({
                  ...config,
                  audio: { ...config.audio, normalization: checked },
                });
                setHasChanges(true);
              }}
            />
          </Surface>

          <Surface>
            <p {...sx(styles.kicker)}>Reformulación IA</p>
            <Toggle
              label="Reescribir con LLM local"
              description={`${config.runtime.llm_model} en ${config.runtime.llm_url}`}
              checked={config.runtime.llm_enabled}
              onChange={checked => {
                setConfig({
                  ...config,
                  runtime: { ...config.runtime, llm_enabled: checked },
                });
                setHasChanges(true);
              }}
            />
          </Surface>
        </div>
      )}
    </PageFrame>
  );
}

function AppearanceCard() {
  return (
    <Surface>
      <p {...sx(styles.kicker)}>Apariencia</p>
      <p {...sx(styles.copy)}>
        Cambia entre modo claro, oscuro o el del sistema. Se aplica al instante.
      </p>
      <ThemeToggle />
    </Surface>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label {...sx(styles.toggle)}>
      <div>
        <p {...sx(styles.label)}>{label}</p>
        <p {...sx(styles.copy)}>{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  );
}
