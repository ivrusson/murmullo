import { useState, useEffect } from 'react';
import { Container, Section, Flex } from '@/components/layout';
import { Button, Card, CardContent, Alert, AlertDescription } from '@/components/ui';
import { Heading, Text, Icon } from '@/components/ui';
import { RefreshCw, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { AudioBubble } from '../AudioBubble';
import { audioService, modelService, transcriptionService } from '../../services/tauri';
import { useAppConfig } from '../../contexts/AppConfigContext';

export function DashboardPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');

  const { selectedDevice, selectedModel, selectedLanguage, isLoading } = useAppConfig();

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if currently recording
        const recording = await audioService.isRecording();
        setIsRecording(recording);

      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Failed to initialize application data');
      }
    };

    initializeData();
  }, []);

  const handleStartRecording = async () => {
    if (!selectedDevice || !selectedModel) {
      setError('Please select a microphone and model first');
      return;
    }

    try {
      setIsRecording(true);
      setError('');
      
      // Apply language setting
      if (selectedLanguage !== 'auto') {
        await transcriptionService.setLanguage(selectedLanguage);
      } else {
        await transcriptionService.setLanguage(null); // Auto-detect
      }

      // Load model if not already loaded
      console.log('🤖 Checking if model is loaded:', selectedModel);
      const isLoaded = await modelService.isModelLoaded(selectedModel);
      console.log('📋 Model loaded status:', isLoaded);
      
      if (!isLoaded) {
        console.log('📥 Loading model:', selectedModel);
        await modelService.loadModel(selectedModel);
        console.log('✅ Model loaded successfully');
      } else {
        console.log('✅ Model already loaded');
      }

      // Start recording
      await audioService.startRecording(selectedDevice);
      
      toast.success('Recording started', {
        description: 'Speak clearly into your microphone'
      });

      // Start audio level monitoring
      const interval = setInterval(async () => {
        try {
          const level = await audioService.getAudioLevel();
          setAudioLevel(level.level);
        } catch (error) {
          console.error('Error getting audio level:', error);
        }
      }, 100);

      // Store interval for cleanup
      (window as any).audioLevelInterval = interval;

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      setError('');

      // Clear audio level monitoring
      if ((window as any).audioLevelInterval) {
        clearInterval((window as any).audioLevelInterval);
        (window as any).audioLevelInterval = null;
      }

      // Stop recording and get audio data
      const audioData = await audioService.stopRecording();
      console.log('🎵 Audio data length:', audioData.length);

      toast.info('Processing audio...', {
        description: 'Transcribing your speech'
      });

      // Transcribe audio
      const result = await transcriptionService.transcribeAudio(audioData);
      console.log('📝 Transcription result:', result);

      setTranscription(result.text);
      setIsProcessing(false);

      toast.success('Transcription completed', {
        description: result.text
      });

    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to process recording');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <Text color="muted">Loading configuration...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <Container size="lg" padding="sm">
        <Section spacing="md">
          {/* Header */}
          <Flex direction="column" gap="xs" className="mb-6">
            <Heading level={1} size="xl" className="font-semibold">Dashboard</Heading>
            <Text color="muted" size="sm" className="font-light">Voice dictation and transcription</Text>
          </Flex>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Configuration */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <Flex direction="column" gap="md">
                <Heading level={2} size="lg" className="font-semibold">Current Configuration</Heading>
                
                <Flex direction="column" gap="sm">
                  <Text weight="medium" size="sm">Microphone</Text>
                  <Text size="sm" color="muted">{selectedDevice || 'Not selected'}</Text>
                </Flex>

                <Flex direction="column" gap="sm">
                  <Text weight="medium" size="sm">Language</Text>
                  <Text size="sm" color="muted">{selectedLanguage === 'auto' ? 'Auto-detect' : selectedLanguage}</Text>
                </Flex>

                <Flex direction="column" gap="sm">
                  <Text weight="medium" size="sm">Model</Text>
                  <Text size="sm" color="muted">{selectedModel || 'Not selected'}</Text>
                </Flex>
              </Flex>
            </CardContent>
          </Card>

          {/* Recording Controls */}
          <Flex justify="center">
            {!isRecording ? (
              <Button
                onClick={handleStartRecording}
                disabled={isProcessing || !selectedDevice || !selectedModel}
                size="lg"
                className="flex items-center gap-3 px-8 py-4"
              >
                {isProcessing ? (
                  <>
                    <Icon icon={RefreshCw} size="lg" className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Icon icon={Play} size="lg" />
                    Start Recording
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <AudioBubble
                    audioLevel={audioLevel}
                    isRecording={isRecording}
                    size={80}
                  />
                  <Text size="sm" color="muted" className="font-mono">
                    Recording...
                  </Text>
                </div>
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  size="lg"
                  className="flex items-center gap-3 px-8 py-4"
                >
                  <Icon icon={Square} size="lg" />
                  Stop Recording
                </Button>
              </div>
            )}
          </Flex>

          {/* Transcription Result */}
          {transcription && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <Flex direction="column" gap="sm">
                  <Heading level={2} size="lg" className="font-semibold">Transcription Result</Heading>
                  <Text className="text-foreground leading-relaxed">{transcription}</Text>
                </Flex>
              </CardContent>
            </Card>
          )}
        </Section>
      </Container>
    </div>
  );
}