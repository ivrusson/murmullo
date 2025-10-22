import { Card, CardContent, Button, Badge } from '@/components/ui';
import { Heading, Text, Icon, Spacer } from '@/components/ui';
import { Flex } from '@/components/layout';
import { Download, CheckCircle, RefreshCw } from 'lucide-react';

interface ModelCardProps {
  name: string;
  size: number;
  description: string;
  languages: string[];
  isDownloaded: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  onDownload?: (modelName: string) => void;
  onSelect?: (modelName: string) => void;
  isSelected?: boolean;
  className?: string;
}

export function ModelCard({
  name,
  size,
  description,
  languages,
  isDownloaded,
  isDownloading = false,
  downloadProgress = 0,
  onDownload,
  onSelect,
  isSelected = false,
  className = ''
}: ModelCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = () => {
    if (isDownloading) {
      return (
        <Badge variant="secondary">
          <Icon icon={RefreshCw} size="xs" className="animate-spin" />
          <Spacer axis="x" size="xs" />
          Downloading...
        </Badge>
      );
    }
    
    if (isDownloaded) {
      return (
        <Badge variant="secondary">
          <Icon icon={CheckCircle} size="xs" />
          <Spacer axis="x" size="xs" />
          Downloaded
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        Available
      </Badge>
    );
  };

  const getActionButton = () => {
    if (isDownloading) {
      return (
        <Button variant="secondary" disabled className="w-full">
          <Icon icon={RefreshCw} size="sm" className="animate-spin" />
          <Spacer axis="x" size="sm" />
          {Math.round(downloadProgress)}%
        </Button>
      );
    }
    
    if (isDownloaded && onSelect) {
      return (
        <Button 
          variant={isSelected ? "default" : "outline"} 
          onClick={() => onSelect(name)}
          className="w-full"
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      );
    }
    
    if (!isDownloaded && onDownload) {
      return (
        <Button variant="default" onClick={() => onDownload(name)} className="w-full">
          <Icon icon={Download} size="sm" />
          <Spacer axis="x" size="sm" />
          Download
        </Button>
      );
    }
    
    return null;
  };

  return (
    <Card className={`${className} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <Flex direction="column" gap="md">
          {/* Header */}
          <Flex justify="between" align="start">
            <Flex direction="column" gap="xs">
              <Heading level={3} size="lg">{name}</Heading>
              <Text size="sm" color="muted">
                {formatFileSize(size)} • {description}
              </Text>
            </Flex>
            {getStatusBadge()}
          </Flex>

          {/* Languages */}
          <Flex direction="column" gap="xs">
            <Text size="xs" color="muted">Supported languages:</Text>
            <div className="flex flex-wrap gap-1">
              {languages.slice(0, 5).map((lang) => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang.toUpperCase()}
                </Badge>
              ))}
              {languages.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{languages.length - 5} more
                </Badge>
              )}
            </div>
          </Flex>

          {/* Download progress */}
          {isDownloading && (
            <Flex direction="column" gap="xs">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <Text size="xs" color="muted">
                Downloading... {Math.round(downloadProgress)}% complete
              </Text>
            </Flex>
          )}

          {/* Action button */}
          {getActionButton()}
        </Flex>
      </CardContent>
    </Card>
  );
}
