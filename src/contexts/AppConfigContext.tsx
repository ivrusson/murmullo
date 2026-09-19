import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { listen } from '@tauri-apps/api/event';
import { configService, audioService, runtimeService } from '../services/tauri';
import type { AppConfig, AudioDevice, RuntimeStatus } from '../types';

interface AppConfigContextType {
  config: AppConfig | null;
  isLoading: boolean;
  audioDevices: AudioDevice[];
  selectedDevice: string;
  setSelectedDevice: (deviceId: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  runtimeStatus: RuntimeStatus | null;
  refreshConfig: () => Promise<void>;
  refreshAudioDevices: () => Promise<void>;
  refreshRuntime: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined
);

export const AppConfigProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(
    null
  );

  const refreshConfig = useCallback(async () => {
    const appConfig = await configService.getConfig();
    setConfig(appConfig);
    setSelectedLanguage(appConfig.runtime?.default_language || 'auto');
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [appConfig, devices, status] = await Promise.all([
          configService.getConfig(),
          audioService.listDevices(),
          runtimeService.status(),
        ]);
        setConfig(appConfig);
        setSelectedLanguage(appConfig.runtime?.default_language || 'auto');
        setAudioDevices(devices);
        if (devices.length > 0) {
          setSelectedDevice(devices[0].id);
        }
        setRuntimeStatus(status);
      } catch (error) {
        console.error('Error loading configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const unlisten = listen('hotkeys-updated', () => {
      void refreshConfig().catch(console.error);
    });
    return () => {
      unlisten.then(fn => fn()).catch(() => undefined);
    };
  }, [refreshConfig]);

  useEffect(() => {
    const id = setInterval(() => {
      runtimeService
        .status()
        .then(setRuntimeStatus)
        .catch(() => undefined);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const refreshAudioDevices = async () => {
    const devices = await audioService.listDevices();
    setAudioDevices(devices);
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].id);
    }
  };

  const refreshRuntime = async () => {
    setRuntimeStatus(await runtimeService.status());
  };

  const handleSetSelectedLanguage = async (language: string) => {
    setSelectedLanguage(language);
    if (config) {
      await configService.updateRuntimeConfig(
        config.runtime.llm_enabled,
        config.runtime.llm_model,
        language === 'auto' ? undefined : language,
        config.runtime.llm_provider
      );
    }
  };

  return (
    <AppConfigContext.Provider
      value={{
        config,
        isLoading,
        audioDevices,
        selectedDevice,
        setSelectedDevice,
        selectedLanguage,
        setSelectedLanguage: handleSetSelectedLanguage,
        runtimeStatus,
        refreshConfig,
        refreshAudioDevices,
        refreshRuntime,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};
