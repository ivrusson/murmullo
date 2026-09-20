import React from 'react';
import { ComboBox } from '@/components/ui-system';
import { RefreshCw, Mic, Globe } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { transcriptionService } from '@/services/tauri';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT } from '@/i18n';

const styles = stylex.create({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 600,
    color: color.ink,
  },
  refresh: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: {
      default: 'transparent',
      ':hover': 'rgba(28, 26, 25, 0.05)',
    },
    color: color.muted,
    cursor: 'pointer',
  },
  status: {
    fontFamily: font.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    borderRadius: radius.pill,
    paddingBlock: 6,
    paddingInline: 10,
    width: 'fit-content',
  },
  ready: {
    backgroundColor: '#EDF4EE',
    color: '#47784E',
  },
  wait: {
    backgroundColor: '#F4F0F9',
    color: '#6E5696',
  },
});

export const GlobalSelectors: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const t = useT();
  const {
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    selectedLanguage,
    setSelectedLanguage,
    refreshAudioDevices,
    runtimeStatus,
  } = useAppConfig();

  const languages = [
    { value: 'auto', label: t('settings.sttLangAutoDetect') },
    { value: 'en', label: t('settings.sttLang.en') },
    { value: 'es', label: t('settings.sttLang.es') },
    { value: 'fr', label: t('settings.sttLang.fr') },
    { value: 'de', label: t('settings.sttLang.de') },
    { value: 'it', label: t('settings.sttLang.it') },
    { value: 'pt', label: t('settings.sttLang.pt') },
  ];

  React.useEffect(() => {
    const apply = async () => {
      try {
        await transcriptionService.setLanguage(
          selectedLanguage === 'auto' ? null : selectedLanguage
        );
      } catch (error) {
        console.error('Error applying language:', error);
      }
    };
    apply();
  }, [selectedLanguage]);

  const ready = runtimeStatus?.dictation_ready;
  const wrap = sx(styles.stack);

  return (
    <div
      className={[wrap.className, className].filter(Boolean).join(' ')}
      style={wrap.style}
    >
      <div {...sx(styles.field)}>
        <div {...sx(styles.labelRow)}>
          <Mic size={14} strokeWidth={1.5} color="currentColor" aria-hidden />
          <p {...sx(styles.label)}>{t('settings.mic')}</p>
          <button
            type="button"
            onClick={refreshAudioDevices}
            title={t('common.refresh')}
            {...sx(styles.refresh)}
          >
            <RefreshCw size={12} strokeWidth={1.5} />
          </button>
        </div>
        <ComboBox
          options={audioDevices.map(device => ({
            value: device.id,
            label: device.name,
          }))}
          value={selectedDevice}
          onValueChange={setSelectedDevice}
          placeholder={t('settings.chooseMic')}
          searchPlaceholder={t('settings.searchMics')}
          emptyText={t('settings.noMics')}
        />
      </div>

      <div {...sx(styles.field)}>
        <div {...sx(styles.labelRow)}>
          <Globe size={14} strokeWidth={1.5} aria-hidden />
          <p {...sx(styles.label)}>{t('settings.sttLanguage')}</p>
        </div>
        <ComboBox
          options={languages}
          value={selectedLanguage}
          onValueChange={setSelectedLanguage}
          placeholder={t('settings.chooseLanguage')}
          searchPlaceholder={t('settings.searchLanguages')}
          emptyText={t('settings.noLanguages')}
        />
      </div>

      <div {...sx(styles.status, ready ? styles.ready : styles.wait)}>
        {ready ? t('settings.sttReady') : t('settings.sttNotReady')}
      </div>
    </div>
  );
};
