import { Card, CardContent, Button, Badge } from '@/components/ui';
import { Text, Icon } from '@/components/ui';
import { Copy, Volume2, Clock } from 'lucide-react';

interface TranscriptionResultProps {
  text: string;
  timestamp?: Date;
  duration?: number;
  language?: string;
  model?: string;
  onCopy?: (text: string) => void;
  onPlay?: (text: string) => void;
}

export function TranscriptionResult({ 
  text, 
  timestamp, 
  duration, 
  language, 
  model,
  onCopy,
  onPlay 
}: TranscriptionResultProps) {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with metadata */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 flex-wrap">
              {timestamp && (
                <>
                  <Icon icon={Clock} size="sm" color="muted" />
                  <Text size="sm" color="muted">{formatTimestamp(timestamp)}</Text>
                </>
              )}
              {duration && (
                <Badge variant="outline">{formatDuration(duration)}</Badge>
              )}
              {language && (
                <Badge variant="secondary">{language.toUpperCase()}</Badge>
              )}
              {model && (
                <Badge variant="outline">{model}</Badge>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {onPlay && (
                <Button variant="ghost" size="sm" onClick={() => onPlay(text)}>
                  <Icon icon={Volume2} size="sm" />
                </Button>
              )}
              {onCopy && (
                <Button variant="ghost" size="sm" onClick={() => onCopy(text)}>
                  <Icon icon={Copy} size="sm" />
                </Button>
              )}
            </div>
          </div>

          {/* Transcription text */}
          <div className="bg-muted p-4 rounded-md border">
            <Text>{text}</Text>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
