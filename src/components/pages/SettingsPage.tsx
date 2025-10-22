import { useState, useEffect } from 'react';
import { Container, Section, Flex } from '@/components/layout';
import { Button, Alert, AlertDescription, Switch, ComboBox, Slider } from '@/components/ui';
import { Heading, Text, Icon } from '@/components/ui';
import { Settings, Save, RotateCcw, Info, Keyboard, Mic, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { configService } from '../../services/tauri';
import type { AppConfig } from '../../types';

export function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading configuration from backend...');
      const appConfig = await configService.getConfig();
      console.log('⚙️ Configuration loaded:', appConfig);
      setConfig(appConfig);
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      toast.error('Failed to load settings', {
        description: 'Could not fetch configuration from backend'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      console.log('💾 Saving configuration...');
      
      // Update audio configuration
      await configService.updateAudioConfig(
        config.audio.noise_reduction,
        config.audio.normalization,
        config.audio.silence_threshold
      );
      
      // Update VAD configuration
      await configService.updateVadConfig(
        config.vad.enabled,
        config.vad.sensitivity,
        config.vad.silence_timeout
      );
      
      // Update Whisper configuration
      await configService.updateWhisperConfig(
        config.whisper.temperature,
        config.whisper.best_of,
        config.whisper.default_language
      );
      
      setHasChanges(false);
      toast.success('Settings saved', {
        description: 'Your preferences have been updated successfully'
      });
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      toast.error('Save failed', {
        description: 'Could not save your settings'
      });
    }
  };

  const handleReset = async () => {
    try {
      console.log('🔄 Resetting configuration to defaults...');
      await configService.resetToDefaults();
      await loadConfig();
      setHasChanges(false);
      toast.info('Settings reset', {
        description: 'All settings have been reset to default values'
      });
    } catch (error) {
      console.error('❌ Error resetting configuration:', error);
      toast.error('Reset failed', {
        description: 'Could not reset settings to defaults'
      });
    }
  };

  return (
    <div className="min-h-full bg-background">
      <Container size="lg" padding="sm">
        <Section spacing="md">
          {/* Header */}
          <Flex direction="column" gap="xs" className="mb-6">
            <Flex align="center" gap="sm">
              <Icon icon={Settings} size="lg" color="primary" />
              <Heading level={1} size="xl" className="font-semibold">Settings</Heading>
            </Flex>
            <Text color="muted" size="sm" className="font-light">Configure Murmullo to your preferences</Text>
          </Flex>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Flex justify="center" align="center" gap="sm">
                <Icon icon={Settings} size="sm" className="animate-spin" />
                <Text className="font-light">Loading settings...</Text>
              </Flex>
            </div>
          ) : !config ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load settings. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Save/Reset Actions */}
              {hasChanges && (
                <Alert className="mb-6">
                  <Icon icon={Info} size="sm" />
                  <AlertDescription>
                    You have unsaved changes. Don't forget to save your settings.
                  </AlertDescription>
                </Alert>
              )}

              <Flex justify="between" align="center" className="mb-6">
                <Text color="muted" size="sm" className="font-light">Configure your preferences below</Text>
                <Flex gap="sm">
                  <Button variant="outline" onClick={handleReset} size="sm">
                    <Icon icon={RotateCcw} size="sm" />
                    Reset
                  </Button>
                  <Button onClick={handleSave} disabled={!hasChanges} size="sm">
                    <Icon icon={Save} size="sm" />
                    Save Changes
                  </Button>
                </Flex>
              </Flex>

              {/* Hotkeys Settings */}
              <div className="mb-8">
                <Flex align="center" gap="sm" className="mb-4">
                  <Icon icon={Keyboard} size="md" color="primary" />
                  <Heading level={2} size="lg" className="font-semibold text-foreground">Hotkeys</Heading>
                </Flex>
                <Text size="sm" color="muted" className="font-light mb-4">
                  Configure keyboard shortcuts for recording functionality.
                </Text>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 px-4 bg-surface-2 border border-border/50 rounded-lg">
                    <Flex direction="column" gap="xs">
                      <Text weight="medium" className="text-foreground">Push to Talk</Text>
                      <Text size="sm" color="muted" className="font-light">Hold to record while pressed</Text>
                    </Flex>
                    <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md font-mono text-sm">
                      {config.hotkeys.push_to_talk}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50 mb-8"></div>

              {/* Audio Settings */}
              <div className="mb-8">
                <Flex align="center" gap="sm" className="mb-4">
                  <Icon icon={Volume2} size="md" color="primary" />
                  <Heading level={2} size="lg" className="font-semibold text-foreground">Audio</Heading>
                </Flex>
                <Text size="sm" color="muted" className="font-light mb-4">
                  Configure audio input settings for optimal recording quality.
                </Text>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Text weight="medium" className="text-foreground text-sm">Sample Rate</Text>
                    <ComboBox
                      options={[
                        { value: "22050", label: "22.05 kHz" },
                        { value: "44100", label: "44.1 kHz" },
                        { value: "48000", label: "48 kHz" }
                      ]}
                      value={config.audio.sample_rate.toString()}
                      onValueChange={(value) => {
                        setConfig({...config, audio: {...config.audio, sample_rate: Number(value)}});
                        setHasChanges(true);
                      }}
                      triggerClassName="h-9"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Text weight="medium" className="text-foreground text-sm">Channels</Text>
                    <ComboBox
                      options={[
                        { value: "1", label: "Mono" },
                        { value: "2", label: "Stereo" }
                      ]}
                      value={config.audio.channels.toString()}
                      onValueChange={(value) => {
                        setConfig({...config, audio: {...config.audio, channels: Number(value)}});
                        setHasChanges(true);
                      }}
                      triggerClassName="h-9"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Text weight="medium" className="text-foreground text-sm">Bit Depth</Text>
                    <ComboBox
                      options={[
                        { value: "16", label: "16-bit" },
                        { value: "24", label: "24-bit" },
                        { value: "32", label: "32-bit" }
                      ]}
                      value={config.audio.bit_depth.toString()}
                      onValueChange={(value) => {
                        setConfig({...config, audio: {...config.audio, bit_depth: Number(value)}});
                        setHasChanges(true);
                      }}
                      triggerClassName="h-9"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <Flex direction="column" gap="xs">
                      <Text weight="medium" className="text-foreground text-sm">Noise Reduction</Text>
                      <Text size="xs" color="muted" className="font-light">Reduce background noise</Text>
                    </Flex>
                    <Switch 
                      checked={config.audio.noise_reduction}
                      onCheckedChange={(checked) => {
                        setConfig({...config, audio: {...config.audio, noise_reduction: checked}});
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <Flex direction="column" gap="xs">
                      <Text weight="medium" className="text-foreground text-sm">Normalization</Text>
                      <Text size="xs" color="muted" className="font-light">Normalize audio levels</Text>
                    </Flex>
                    <Switch 
                      checked={config.audio.normalization}
                      onCheckedChange={(checked) => {
                        setConfig({...config, audio: {...config.audio, normalization: checked}});
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50 mb-8"></div>

              {/* Whisper Settings */}
              <div className="mb-8">
                <Flex align="center" gap="sm" className="mb-4">
                  <Icon icon={Mic} size="md" color="primary" />
                  <Heading level={2} size="lg" className="font-semibold text-foreground">Whisper Configuration</Heading>
                </Flex>
                <Text size="sm" color="muted" className="font-light mb-4">
                  Configure Whisper model parameters for transcription.
                </Text>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <Text weight="medium" className="text-foreground text-sm">Temperature</Text>
                    <Slider
                      value={[config.whisper.temperature]}
                      onValueChange={(value) => {
                        setConfig({...config, whisper: {...config.whisper, temperature: value[0]}});
                        setHasChanges(true);
                      }}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <Text size="xs" color="muted" className="font-light text-center">{config.whisper.temperature}</Text>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Text weight="medium" className="text-foreground text-sm">Best Of</Text>
                    <ComboBox
                      options={[
                        { value: "1", label: "1" },
                        { value: "3", label: "3" },
                        { value: "5", label: "5" }
                      ]}
                      value={config.whisper.best_of.toString()}
                      onValueChange={(value) => {
                        setConfig({...config, whisper: {...config.whisper, best_of: Number(value)}});
                        setHasChanges(true);
                      }}
                      triggerClassName="h-9"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Text weight="medium" className="text-foreground text-sm">Default Language</Text>
                  <ComboBox
                    options={[
                      { value: "auto", label: "Auto-detect" },
                      { value: "en", label: "English" },
                      { value: "es", label: "Spanish" },
                      { value: "fr", label: "French" },
                      { value: "de", label: "German" }
                    ]}
                    value={config.whisper.default_language || 'auto'}
                    onValueChange={(value) => {
                      setConfig({...config, whisper: {...config.whisper, default_language: value === 'auto' ? undefined : value}});
                      setHasChanges(true);
                    }}
                    triggerClassName="h-9"
                  />
                </div>
              </div>
            </>
          )}
        </Section>
      </Container>
    </div>
  );
}