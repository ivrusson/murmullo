import React from 'react';
import { ComboBox } from '@/components/ui';
import { Text, Icon } from '@/components/ui';
import { RefreshCw, Mic, Globe } from 'lucide-react';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { transcriptionService } from '@/services/tauri';

export const GlobalSelectors: React.FC<{ className?: string }> = ({
  className = '',
}) => {
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
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
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

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon icon={Mic} size="sm" color="muted" />
          <Text weight="medium" size="sm" className="text-foreground">
            Microphone
          </Text>
          <button
            onClick={refreshAudioDevices}
            className="ml-auto p-1 hover:bg-surface-2 rounded"
            title="Refresh"
          >
            <Icon icon={RefreshCw} size="xs" />
          </button>
        </div>
        <ComboBox
          options={audioDevices.map(device => ({
            value: device.id,
            label: device.name,
          }))}
          value={selectedDevice}
          onValueChange={setSelectedDevice}
          placeholder="Select microphone"
          searchPlaceholder="Search microphones..."
          emptyText="No microphones found"
          triggerClassName="h-8"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon icon={Globe} size="sm" color="muted" />
          <Text weight="medium" size="sm" className="text-foreground">
            Language
          </Text>
        </div>
        <ComboBox
          options={languages}
          value={selectedLanguage}
          onValueChange={setSelectedLanguage}
          placeholder="Select language"
          searchPlaceholder="Search languages..."
          emptyText="No languages found"
          triggerClassName="h-8"
        />
      </div>

      <div
        className={`font-mono text-[10px] rounded-xl px-2 py-1.5 vf-inset ${ready ? 'text-cyan' : 'text-amber'}`}
      >
        {ready ? 'STT listo (Parakeet)' : 'STT no listo — abre Runtimes'}
      </div>
    </div>
  );
};
