import { Button, Alert, AlertDescription } from '@/components/ui';
import { Text, Icon, Spacer } from '@/components/ui';
import { Flex } from '@/components/layout';
import { Play, Square, Pause, RefreshCw } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  hasTranscription: boolean;
  canStartRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onInsertText?: () => void;
  className?: string;
}

export function RecordingControls({
  isRecording,
  isProcessing,
  hasTranscription,
  canStartRecording,
  onStartRecording,
  onStopRecording,
  onInsertText,
  className = ''
}: RecordingControlsProps) {
  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Recording...';
    return 'Start Recording';
  };

  const getButtonIcon = () => {
    if (isProcessing) return RefreshCw;
    if (isRecording) return Pause;
    return Play;
  };

  const getButtonVariant = () => {
    if (isRecording) return 'destructive' as const;
    if (isProcessing) return 'secondary' as const;
    return 'default' as const;
  };

  return (
    <div className={className}>
      {/* Error state */}
      {!canStartRecording && !isRecording && (
        <Alert className="mb-4">
          <AlertDescription>
            Please configure a microphone and model before starting recording.
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Flex justify="center" gap="md">
        {!isRecording ? (
          <Button
            variant={getButtonVariant()}
            size="lg"
            onClick={onStartRecording}
            disabled={isProcessing || !canStartRecording}
            className="min-w-[200px] h-12"
          >
            <Icon 
              icon={getButtonIcon()} 
              size="sm" 
              className={isProcessing ? "animate-spin" : ""} 
            />
            <Spacer axis="x" size="sm" />
            {getButtonText()}
          </Button>
        ) : (
          <>
            <Button
              variant="destructive"
              size="lg"
              onClick={onStopRecording}
              className="h-12"
            >
              <Icon icon={Square} size="sm" />
              <Spacer axis="x" size="sm" />
              Stop Recording
            </Button>
            
            {hasTranscription && onInsertText && (
              <Button
                variant="default"
                size="lg"
                onClick={onInsertText}
                className="h-12"
              >
                Insert Text
              </Button>
            )}
          </>
        )}
      </Flex>

      {/* Status text */}
      {isRecording && (
        <Flex justify="center" className="mt-4">
          <Text size="sm" color="muted">
            Recording... Speak clearly into your microphone
          </Text>
        </Flex>
      )}
      
      {isProcessing && (
        <Flex justify="center" className="mt-4">
          <Text size="sm" color="muted">
            Processing your speech...
          </Text>
        </Flex>
      )}
    </div>
  );
}
