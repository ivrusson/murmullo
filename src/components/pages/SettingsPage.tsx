import { useState, useEffect } from 'react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { configService, runtimeService } from '@/services/tauri';
import { GlobalSelectors } from '@/components/GlobalSelectors';
import { HotkeyRecorder } from '@/components/HotkeyRecorder';
import { OverlayStylePicker } from '@/components/OverlayStylePicker';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { useT, mapBackendError } from '@/i18n';
import { Switch } from '@/components/ui-system/Switch';
import { Select } from '@/components/ui-system/Select';
import { ComboBox } from '@/components/ui-system/ComboBox';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { validateHotkey } from '@/lib/hotkey';
import type { AppConfig, LlmProviderInfo } from '@/types';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { Button } from '@/components/ui-system/Button';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { FeedbackLaunchButtons } from '@/components/FeedbackDialog';

const styles = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr 1fr',
      '@media (max-width: 1100px)': '1fr',
    },
    gap: space.md,
    alignItems: 'start',
  },
  kicker: {
    margin: 0,
    marginBottom: space.md,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  copy: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '20px',
  },
  error: {
    color: color.danger,
    fontSize: 13,
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: 14,
    paddingInline: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    marginBottom: space.sm,
  },
  label: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
  },
  themeWrap: {
    marginTop: space.md,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: space.sm,
  },
  fieldLabel: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    color: color.muted,
  },
  helpActions: {
    marginTop: space.md,
  },
});

export function SettingsPage() {
  const t = useT();
  const { refreshConfig } = useAppConfig();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [providers, setProviders] = useState<LlmProviderInfo[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setConfig(await configService.getConfig());
      } catch {
        toast.error(t('settings.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    runtimeService
      .listLlmProviders()
      .then(setProviders)
      .catch(() => undefined);
  }, [t]);

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
          config.runtime.default_language,
          config.runtime.llm_provider || 'ollama'
        ),
        configService.updateHotkeyConfig(
          config.hotkeys.push_to_talk,
          config.hotkeys.enabled
        ),
      ]);
      setHasChanges(false);
      setHotkeyError(null);
      await refreshConfig();
      toast.success(t('settings.saved'));
    } catch (error) {
      const message = mapBackendError(error);
      setHotkeyError(message);
      toast.error(message);
    }
  };

  return (
    <PageFrame>
      <PageHeader
        title={t('settings.title')}
        lede={t('settings.lede')}
        actions={
          <Button
            onClick={() => void handleSave()}
            disabled={
              !hasChanges || isLoading || !config?.hotkeys.push_to_talk?.trim()
            }
          >
            {t('common.save')}
          </Button>
        }
      />

      {isLoading ? (
        <div {...sx(styles.grid)}>
          <AppearanceCard />
          <Surface>
            <p {...sx(styles.copy)}>{t('settings.loading')}</p>
          </Surface>
        </div>
      ) : !config ? (
        <div {...sx(styles.grid)}>
          <AppearanceCard />
          <Surface>
            <p {...sx(styles.copy)}>{t('settings.desktopOnly')}</p>
          </Surface>
        </div>
      ) : (
        <div {...sx(styles.grid)}>
          <AppearanceCard />

          <Surface>
            <p {...sx(styles.kicker)}>{t('settings.inputDevice')}</p>
            <GlobalSelectors />
          </Surface>

          <Surface>
            <p {...sx(styles.kicker)}>{t('settings.globalShortcuts')}</p>
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
                toast.success(t('settings.hotkeyUpdated'));
              }}
            />
            {hotkeyError ? <p {...sx(styles.error)}>{hotkeyError}</p> : null}
            <p {...sx(styles.copy)}>{t('settings.hotkeyHint')}</p>
          </Surface>

          <Surface>
            <p {...sx(styles.kicker)}>{t('settings.cancelAudio')}</p>
            <Toggle
              label={t('settings.noise')}
              description={t('settings.noiseHint')}
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
              label={t('settings.normalize')}
              description={t('settings.normalizeHint')}
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
            <p {...sx(styles.kicker)}>{t('settings.llmRewrite')}</p>
            <Toggle
              label={t('settings.rewrite')}
              description={llmDescription(config.runtime, providers, t)}
              checked={config.runtime.llm_enabled}
              onChange={checked => {
                setConfig({
                  ...config,
                  runtime: { ...config.runtime, llm_enabled: checked },
                });
                setHasChanges(true);
              }}
            />
            <div {...sx(styles.field)}>
              <p {...sx(styles.fieldLabel)}>{t('settings.provider')}</p>
              <Select
                value={config.runtime.llm_provider || 'ollama'}
                onValueChange={value => {
                  const next = providers.find(item => item.id === value);
                  const keepModel =
                    next?.models.includes(config.runtime.llm_model) ?? false;
                  setConfig({
                    ...config,
                    runtime: {
                      ...config.runtime,
                      llm_provider: value,
                      llm_model: keepModel
                        ? config.runtime.llm_model
                        : (next?.default_model ?? config.runtime.llm_model),
                    },
                  });
                  setHasChanges(true);
                }}
                items={(providers.length > 0
                  ? providers
                  : [
                      {
                        id: 'ollama',
                        label: 'Ollama',
                        installed: true,
                      },
                      { id: 'kimi', label: 'Kimi', installed: false },
                      { id: 'kilo', label: 'Kilo', installed: false },
                      { id: 'cursor', label: 'Cursor', installed: false },
                      { id: 'claude', label: 'Claude', installed: false },
                    ]
                ).map(item => ({
                  value: item.id,
                  label: item.installed
                    ? item.label
                    : t('settings.notInstalled', { label: item.label }),
                }))}
                placeholder={t('settings.chooseProvider')}
              />
            </div>
            <div {...sx(styles.field)}>
              <p {...sx(styles.fieldLabel)}>{t('settings.model')}</p>
              <ComboBox
                value={config.runtime.llm_model}
                onValueChange={value => {
                  if (!value) return;
                  setConfig({
                    ...config,
                    runtime: { ...config.runtime, llm_model: value },
                  });
                  setHasChanges(true);
                }}
                options={modelOptions(config, providers)}
                placeholder={t('settings.chooseModel')}
                searchPlaceholder={t('settings.searchModel')}
                emptyText={t('settings.noModels')}
              />
            </div>
            {selectedProvider(config, providers)?.hint ? (
              <p {...sx(styles.copy)}>
                {selectedProvider(config, providers)?.hint}
              </p>
            ) : null}
          </Surface>
        </div>
      )}
      <HelpCard />
    </PageFrame>
  );
}

function AppearanceCard() {
  const t = useT();
  return (
    <Surface>
      <p {...sx(styles.kicker)}>{t('settings.appearance')}</p>
      <p {...sx(styles.copy)}>{t('settings.appearanceBody')}</p>
      <div {...sx(styles.themeWrap)}>
        <ThemeToggle />
      </div>
      <p {...sx(styles.kicker)} style={{ marginTop: 16 }}>
        {t('settings.language')}
      </p>
      <p {...sx(styles.copy)}>{t('settings.languageBody')}</p>
      <div {...sx(styles.themeWrap)}>
        <LocaleToggle />
      </div>
      <OverlayStylePicker />
    </Surface>
  );
}

function HelpCard() {
  const t = useT();
  return (
    <Surface>
      <p {...sx(styles.kicker)}>{t('feedback.helpTitle')}</p>
      <p {...sx(styles.copy)}>{t('feedback.helpBody')}</p>
      <div {...sx(styles.helpActions)}>
        <FeedbackLaunchButtons />
      </div>
    </Surface>
  );
}

function selectedProvider(
  config: AppConfig,
  providers: LlmProviderInfo[]
): LlmProviderInfo | undefined {
  const id = config.runtime.llm_provider || 'ollama';
  return providers.find(item => item.id === id);
}

function modelOptions(config: AppConfig, providers: LlmProviderInfo[]) {
  const provider = selectedProvider(config, providers);
  const models = new Set(provider?.models ?? []);
  if (config.runtime.llm_model) {
    models.add(config.runtime.llm_model);
  }
  return Array.from(models).map(value => ({ value, label: value }));
}

function llmDescription(
  runtime: AppConfig['runtime'],
  providers: LlmProviderInfo[],
  t: (
    key: import('@/i18n').AppMessageKey,
    params?: import('@/i18n').TranslateParams
  ) => string
): string {
  const provider =
    providers.find(item => item.id === (runtime.llm_provider || 'ollama'))
      ?.label ??
    runtime.llm_provider ??
    'Ollama';
  if ((runtime.llm_provider || 'ollama') === 'ollama') {
    return t('settings.llmDescUrl', {
      model: runtime.llm_model,
      provider,
      url: runtime.llm_url,
    });
  }
  return t('settings.llmDesc', { model: runtime.llm_model, provider });
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
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
