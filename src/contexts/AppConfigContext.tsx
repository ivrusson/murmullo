import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { configService, audioService, modelService } from '../services/tauri';
import type { AppConfig, AudioDevice, ModelInfo } from '../types';

interface AppConfigContextType {
  // Configuration
  config: AppConfig | null;
  isLoading: boolean;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  
  // Audio devices
  audioDevices: AudioDevice[];
  selectedDevice: string;
  setSelectedDevice: (deviceId: string) => void;
  
  // Models
  models: ModelInfo[];
  selectedModel: string;
  setSelectedModel: (modelName: string) => void;
  
  // Language
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  
  // Refresh functions
  refreshAudioDevices: () => Promise<void>;
  refreshModels: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

interface AppConfigProviderProps {
  children: ReactNode;
}

export const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');

  // Load initial configuration
  useEffect(() => {
    const loadInitialConfig = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Loading global app configuration...');
        
        // Load app config
        const appConfig = await configService.getConfig();
        setConfig(appConfig);
        
        // Set language from config
        const defaultLanguage = appConfig.whisper.default_language || 'auto';
        setSelectedLanguage(defaultLanguage);
        console.log('🌍 Default language loaded:', defaultLanguage);
        
        // Load audio devices
        const devices = await audioService.listDevices();
        setAudioDevices(devices);
        if (devices.length > 0) {
          setSelectedDevice(devices[0].id);
        }
        
        // Load models
        const modelList = await modelService.listModels();
        setModels(modelList);
        
        // Get selected model from config
        const selectedModelName = await configService.getSelectedModel();
        if (selectedModelName) {
          setSelectedModel(selectedModelName);
        } else if (modelList.length > 0) {
          // Auto-select first downloaded model
          const downloadedModel = modelList.find(m => m.is_downloaded);
          if (downloadedModel) {
            setSelectedModel(downloadedModel.name);
          }
        }
        
        console.log('✅ Global app configuration loaded successfully');
      } catch (error) {
        console.error('❌ Error loading global configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialConfig();
  }, []);

  // Update configuration
  const updateConfig = async (updates: Partial<AppConfig>) => {
    if (!config) return;
    
    try {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      
      // Save to backend
      if (updates.whisper) {
        await configService.updateWhisperConfig(
          updates.whisper.temperature || config.whisper.temperature,
          updates.whisper.best_of || config.whisper.best_of,
          updates.whisper.default_language
        );
      }
      
      console.log('⚙️ Configuration updated:', updates);
    } catch (error) {
      console.error('❌ Error updating configuration:', error);
    }
  };

  // Refresh audio devices
  const refreshAudioDevices = async () => {
    try {
      const devices = await audioService.listDevices();
      setAudioDevices(devices);
      if (devices.length > 0 && !selectedDevice) {
        setSelectedDevice(devices[0].id);
      }
    } catch (error) {
      console.error('❌ Error refreshing audio devices:', error);
    }
  };

  // Refresh models
  const refreshModels = async () => {
    try {
      const modelList = await modelService.listModels();
      setModels(modelList);
      
      // Update selected model if current one is no longer available
      const currentModel = modelList.find(m => m.name === selectedModel);
      if (!currentModel || !currentModel.is_downloaded) {
        const downloadedModel = modelList.find(m => m.is_downloaded);
        if (downloadedModel) {
          setSelectedModel(downloadedModel.name);
          await configService.updateSelectedModel(downloadedModel.name);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing models:', error);
    }
  };

  // Handle language change
  const handleSetSelectedLanguage = async (language: string) => {
    setSelectedLanguage(language);
    
    // Update config
    await updateConfig({
      whisper: {
        temperature: config?.whisper?.temperature ?? 0.0,
        best_of: config?.whisper?.best_of ?? 5,
        auto_detect: config?.whisper?.auto_detect ?? true,
        initial_prompt: config?.whisper?.initial_prompt ?? '',
        default_language: language === 'auto' ? undefined : language
      }
    });
  };

  // Handle model change
  const handleSetSelectedModel = async (modelName: string) => {
    setSelectedModel(modelName);
    await configService.updateSelectedModel(modelName);
  };

  const value: AppConfigContextType = {
    config,
    isLoading,
    updateConfig,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    models,
    selectedModel,
    setSelectedModel: handleSetSelectedModel,
    selectedLanguage,
    setSelectedLanguage: handleSetSelectedLanguage,
    refreshAudioDevices,
    refreshModels,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};
