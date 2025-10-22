import { useState, useEffect } from 'react';
import { Container, Section, Flex } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import { Heading, Text, Icon } from '@/components/ui';
import { RefreshCw, Download, CheckCircle, Database, Star } from 'lucide-react';
import { toast } from 'sonner';
import { modelService, configService } from '../../services/tauri';
import type { ModelInfo } from '../../types';

export function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadModel = async (modelName: string) => {
    try {
      setDownloadingModel(modelName);
      setDownloadProgress(0);

      console.log(`📥 Starting download of model: ${modelName}`);
      
      // Start download
      await modelService.downloadModel(modelName);
      
      // Monitor download progress
      const progressInterval = setInterval(async () => {
        try {
          // For now, simulate progress since getDownloadProgress doesn't exist
          setDownloadProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setDownloadingModel(null);
              setDownloadProgress(0);
              
              // Refresh models list
              loadModels();
              
              toast.success('Model downloaded', {
                description: `${modelName} has been downloaded successfully`
              });
              return 100;
            }
            return prev + 10;
          });
        } catch (error) {
          console.error('Error monitoring download progress:', error);
          clearInterval(progressInterval);
          setDownloadingModel(null);
          setDownloadProgress(0);
        }
      }, 500);

    } catch (error) {
      console.error('Error downloading model:', error);
      setDownloadingModel(null);
      setDownloadProgress(0);
      toast.error('Download failed', {
        description: `Could not download ${modelName}`
      });
    }
  };

  const loadModels = async () => {
    try {
      setIsRefreshing(true);
      console.log('🔄 Loading models...');
      const modelsList = await modelService.listModels();
      console.log('📋 Models loaded:', modelsList);
      setModels(modelsList);
      
      // Load selected model
      const selectedModelName = await configService.getSelectedModel();
      console.log('⭐ Selected model:', selectedModelName);
      setSelectedModel(selectedModelName);
    } catch (error) {
      console.error('❌ Error loading models:', error);
      toast.error('Failed to load models', {
        description: 'Could not fetch models from backend'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectModel = async (modelName: string) => {
    try {
      console.log(`⭐ Selecting model: ${modelName}`);
      await configService.updateSelectedModel(modelName);
      setSelectedModel(modelName);
      
      toast.success('Model selected', {
        description: `${modelName} is now the active model for transcription`
      });
    } catch (error) {
      console.error('❌ Error selecting model:', error);
      toast.error('Failed to select model', {
        description: `Could not set ${modelName} as the active model`
      });
    }
  };

  const downloadedModels = models.filter(model => model.is_downloaded);
  const availableModels = models.filter(model => !model.is_downloaded);

  return (
    <div className="min-h-full bg-background">
      <Container size="lg" padding="sm">
        <Section spacing="md">
          {/* Header */}
          <Flex direction="column" gap="xs" className="mb-6">
            <Flex align="center" gap="sm">
              <Icon icon={Database} size="lg" color="primary" />
              <Heading level={1} size="xl" className="font-semibold">Models</Heading>
            </Flex>
            <Text color="muted" size="sm" className="font-light">Manage Whisper models for transcription</Text>
          </Flex>

          {/* Refresh Button */}
          <Flex justify="between" align="center" className="mb-6">
            <Text color="muted" size="sm" className="font-light">Download and manage Whisper models</Text>
            <Button 
              variant="outline" 
              onClick={loadModels} 
              disabled={isRefreshing}
              size="sm"
            >
              <Icon icon={RefreshCw} size="sm" className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </Flex>

          {/* Downloaded Models */}
          <div className="mb-8">
            <Flex align="center" gap="sm" className="mb-4">
              <Icon icon={CheckCircle} size="md" color="success" />
              <Heading level={2} size="lg" className="font-semibold text-foreground">Downloaded Models</Heading>
            </Flex>
            <Text size="sm" color="muted" className="font-light mb-4">
              Models ready for transcription
            </Text>
            
            {downloadedModels.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Database className="w-6 h-6 text-muted-foreground" />
                </div>
                <Text size="sm" color="muted" className="font-light">
                  No models downloaded yet
                </Text>
                <Text size="xs" color="muted" className="font-light">
                  Download a model below to get started
                </Text>
              </div>
            ) : (
              <div className="space-y-3">
                {downloadedModels.map((model) => (
                  <div key={model.name} className="flex justify-between items-center py-3 px-4 bg-surface-2 border border-border/50 rounded-lg">
                    <Flex direction="column" gap="xs">
                      <Flex align="center" gap="sm">
                        <Text weight="medium" className="text-foreground">{model.name}</Text>
                        {selectedModel === model.name && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                            <Icon icon={Star} size="xs" />
                            Active
                          </Badge>
                        )}
                      </Flex>
                      <Text size="sm" color="muted" className="font-light">{model.description}</Text>
                      <div className="flex gap-3 text-xs text-muted-foreground font-light">
                        <span>{formatFileSize(model.size)}</span>
                        <span>•</span>
                        <span>{model.languages.length} languages</span>
                      </div>
                    </Flex>
                    <Flex align="center" gap="sm">
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                        Ready
                      </Badge>
                      {selectedModel !== model.name && (
                        <Button
                          onClick={() => handleSelectModel(model.name)}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Icon icon={Star} size="sm" />
                          Select
                        </Button>
                      )}
                    </Flex>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Model */}
          {selectedModel && (
            <div className="mb-8">
              <Flex align="center" gap="sm" className="mb-4">
                <Icon icon={Star} size="md" color="primary" />
                <Heading level={2} size="lg" className="font-semibold text-foreground">Current Model</Heading>
              </Flex>
              <Text size="sm" color="muted" className="font-light mb-4">
                The model currently used for transcription
              </Text>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <Flex align="center" gap="sm" className="mb-2">
                  <Icon icon={Star} size="sm" color="primary" />
                  <Text weight="medium" className="text-primary">{selectedModel}</Text>
                </Flex>
                <Text size="sm" color="muted" className="font-light">
                  This model will be used for all new transcriptions. You can change it by selecting a different model above.
                </Text>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/50 mb-8"></div>

          {/* Available Models */}
          <div className="mb-8">
            <Flex align="center" gap="sm" className="mb-4">
              <Icon icon={Download} size="md" color="primary" />
              <Heading level={2} size="lg" className="font-semibold text-foreground">Available Models</Heading>
            </Flex>
            <Text size="sm" color="muted" className="font-light mb-4">
              Download models for offline transcription
            </Text>
            
            {availableModels.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <Text size="sm" color="muted" className="font-light">
                  All models downloaded
                </Text>
                <Text size="xs" color="muted" className="font-light">
                  You have all available models ready to use
                </Text>
              </div>
            ) : (
              <div className="space-y-3">
                {availableModels.map((model) => (
                  <div key={model.name} className="flex justify-between items-center py-3 px-4 bg-surface-2 border border-border/50 rounded-lg">
                    <Flex direction="column" gap="xs">
                      <Text weight="medium" className="text-foreground">{model.name}</Text>
                      <Text size="sm" color="muted" className="font-light">{model.description}</Text>
                      <div className="flex gap-3 text-xs text-muted-foreground font-light">
                        <span>{formatFileSize(model.size)}</span>
                        <span>•</span>
                        <span>{model.languages.length} languages</span>
                      </div>
                    </Flex>
                    <Button
                      onClick={() => handleDownloadModel(model.name)}
                      disabled={downloadingModel === model.name}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {downloadingModel === model.name ? (
                        <>
                          <Icon icon={RefreshCw} size="sm" className="animate-spin" />
                          {downloadProgress}%
                        </>
                      ) : (
                        <>
                          <Icon icon={Download} size="sm" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model Information */}
          <div className="mb-8">
            <Flex align="center" gap="sm" className="mb-4">
              <Icon icon={Database} size="md" color="primary" />
              <Heading level={2} size="lg" className="font-semibold text-foreground">Model Information</Heading>
            </Flex>
            <Text size="sm" color="muted" className="font-light mb-4">
              Understanding Whisper models and their capabilities
            </Text>
            
            <div className="bg-surface-2 border border-border/50 rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <Text weight="medium" className="text-foreground text-sm mb-1">Model Sizes</Text>
                  <Text size="sm" color="muted" className="font-light">
                    Larger models provide better accuracy but require more computational resources. 
                    Choose based on your hardware capabilities and accuracy requirements.
                  </Text>
                </div>
                
                <div>
                  <Text weight="medium" className="text-foreground text-sm mb-1">Offline Processing</Text>
                  <Text size="sm" color="muted" className="font-light">
                    All models run completely offline on your device. No data is sent to external servers, 
                    ensuring your privacy and security.
                  </Text>
                </div>
                
                <div>
                  <Text weight="medium" className="text-foreground text-sm mb-1">Language Support</Text>
                  <Text size="sm" color="muted" className="font-light">
                    Whisper models support multiple languages and can auto-detect the language being spoken. 
                    You can also specify a language for better accuracy.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </Container>
    </div>
  );
}