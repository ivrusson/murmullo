import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { configService } from '../../services/tauri';
import { GlobalSelectors } from '../GlobalSelectors';
import { HotkeyRecorder } from '../HotkeyRecorder';
import { ThemeToggle } from '../ThemeToggle';
import { useAppConfig } from '../../contexts/AppConfigContext';
import { validateHotkey } from '../../lib/hotkey';
import type { AppConfig } from '../../types';

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
      await configService.updateAudioConfig(
        config.audio.noise_reduction,
        config.audio.normalization,
        config.audio.silence_threshold
      );
      await configService.updateRuntimeConfig(
        config.runtime.llm_enabled,
        config.runtime.llm_model,
        config.runtime.default_language
      );
      await configService.updateHotkeyConfig(
        config.hotkeys.push_to_talk,
        config.hotkeys.enabled
      );
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
    <div className="min-h-full px-6 py-6 space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Configuración & Diccionario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apariencia, audio, atajos e inserción local
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={
            !hasChanges || isLoading || !config?.hotkeys.push_to_talk?.trim()
          }
          className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Guardar
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <AppearanceCard />
          <div className="vf-card p-6 text-sm text-muted-foreground">
            Cargando ajustes…
          </div>
        </div>
      ) : !config ? (
        <div className="space-y-4">
          <AppearanceCard />
          <div className="vf-card p-6 text-sm text-muted-foreground">
            No se pudieron cargar los ajustes. Abre Murmullo como app de
            escritorio.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AppearanceCard />

          <section className="vf-card p-5 space-y-4">
            <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
              Dispositivo de entrada
            </div>
            <GlobalSelectors />
          </section>

          <section className="vf-card p-5 space-y-4">
            <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
              Atajos globales
            </div>
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
            {hotkeyError && (
              <p className="text-xs text-destructive">{hotkeyError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Mantén pulsado para dictar. El atajo nuevo se aplica al instante,
              sin reiniciar.
            </p>
          </section>

          <section className="vf-card p-5 space-y-4">
            <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
              Cancelación y audio
            </div>
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
          </section>

          <section className="vf-card p-5 space-y-4">
            <div className="font-mono text-[10px] text-amber uppercase tracking-wider">
              Reformulación IA
            </div>
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
          </section>
        </div>
      )}
    </div>
  );
}

function AppearanceCard() {
  return (
    <section className="vf-card p-5 space-y-4">
      <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
        Apariencia
      </div>
      <p className="text-sm text-muted-foreground">
        Cambia entre modo claro, oscuro o el del sistema. Se aplica al instante.
      </p>
      <ThemeToggle />
    </section>
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
    <label className="flex items-center justify-between gap-4 vf-inset rounded-xl px-4 py-3 cursor-pointer">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-5 w-9 accent-primary"
      />
    </label>
  );
}
