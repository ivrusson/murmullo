import { Flex } from '@/components/layout';
import { Button, Badge, Alert, AlertDescription } from '@/components/ui';
import { Text, Icon } from '@/components/ui';
import { RefreshCw, Database } from 'lucide-react';
import type { ModelInfo } from '../../types';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelName: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  onRefresh,
  isRefreshing = false,
  className = ''
}: ModelSelectorProps) {
  const downloadedModels = models.filter(m => m.is_downloaded);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <Flex justify="between" align="center" className="mb-3">
        <Flex align="center" gap="sm">
          <Text weight="medium" size="sm">Model</Text>
          {selectedModel && (
            <Badge variant="secondary">
              <Icon icon={Database} size="xs" />
              Loaded
            </Badge>
          )}
        </Flex>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <Icon 
              icon={RefreshCw} 
              size="sm" 
              className={isRefreshing ? "animate-spin" : ""} 
            />
          </Button>
        )}
      </Flex>

      {downloadedModels.length === 0 ? (
        <Alert>
          <AlertDescription>
            No models downloaded. Go to the Models tab to download a model first.
          </AlertDescription>
        </Alert>
      ) : (
        <select 
          className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
        >
          <option value="">Select a model</option>
          {downloadedModels.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name} ({formatFileSize(model.size)})
            </option>
          ))}
        </select>
      )}

      {selectedModel && (
        <Flex align="center" gap="sm" className="mt-2">
          <Icon icon={Database} size="xs" color="success" />
          <Text size="xs" color="muted">
            Selected: {selectedModel}
          </Text>
        </Flex>
      )}
    </div>
  );
}
