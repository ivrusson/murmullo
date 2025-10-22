import React from 'react';
import { ComboBox } from '@/components/ui';
import { Text, Icon } from '@/components/ui';
import { RefreshCw, Mic, Database, Globe } from 'lucide-react';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { transcriptionService } from '@/services/tauri';

interface GlobalSelectorsProps {
  className?: string;
}

export const GlobalSelectors: React.FC<GlobalSelectorsProps> = ({ className = '' }) => {
  const {
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    models,
    selectedModel,
    setSelectedModel,
    selectedLanguage,
    setSelectedLanguage,
    refreshAudioDevices,
    refreshModels,
  } = useAppConfig();

  const downloadedModels = models.filter(model => model.is_downloaded);

  const languages = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' }
  ];

  // Apply language setting when it changes
  React.useEffect(() => {
    const applyLanguageSetting = async () => {
      try {
        if (selectedLanguage !== 'auto') {
          await transcriptionService.setLanguage(selectedLanguage);
          console.log('🌍 Language applied:', selectedLanguage);
        } else {
          await transcriptionService.setLanguage(null); // Auto-detect
          console.log('🌍 Language set to auto-detect');
        }
      } catch (error) {
        console.error('❌ Error applying language setting:', error);
      }
    };

    applyLanguageSetting();
  }, [selectedLanguage]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Audio Device Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon icon={Mic} size="sm" color="muted" />
          <Text weight="medium" size="sm" className="text-foreground">Microphone</Text>
          <button
            onClick={refreshAudioDevices}
            className="ml-auto p-1 hover:bg-surface-2 rounded transition-colors"
            title="Refresh devices"
          >
            <Icon icon={RefreshCw} size="xs" />
          </button>
        </div>
        <ComboBox
          options={audioDevices.map(device => ({
            value: device.id,
            label: device.name
          }))}
          value={selectedDevice}
          onValueChange={setSelectedDevice}
          placeholder="Select microphone"
          searchPlaceholder="Search microphones..."
          emptyText="No microphones found"
          triggerClassName="h-8"
        />
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon icon={Globe} size="sm" color="muted" />
          <Text weight="medium" size="sm" className="text-foreground">Language</Text>
        </div>
        <ComboBox
          options={languages.map(lang => ({
            value: lang.value,
            label: lang.label
          }))}
          value={selectedLanguage}
          onValueChange={setSelectedLanguage}
          placeholder="Select language"
          searchPlaceholder="Search languages..."
          emptyText="No languages found"
          triggerClassName="h-8"
        />
      </div>

      {/* Model Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon icon={Database} size="sm" color="muted" />
          <Text weight="medium" size="sm" className="text-foreground">Model</Text>
          <button
            onClick={refreshModels}
            className="ml-auto p-1 hover:bg-surface-2 rounded transition-colors"
            title="Refresh models"
          >
            <Icon icon={RefreshCw} size="xs" />
          </button>
        </div>
        {downloadedModels.length === 0 ? (
          <div className="h-8 flex items-center justify-center text-xs text-muted-foreground bg-surface-2 rounded border border-border/50">
            No models downloaded
          </div>
        ) : (
          <ComboBox
            options={downloadedModels.map(model => ({
              value: model.name,
              label: model.name
            }))}
            value={selectedModel}
            onValueChange={setSelectedModel}
            placeholder="Select model"
            searchPlaceholder="Search models..."
            emptyText="No models found"
            triggerClassName="h-8"
          />
        )}
      </div>
    </div>
  );
};
