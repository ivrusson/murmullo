import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Container, Section, Flex } from '@/components/layout';
import { Badge } from '@/components/ui';
import { Heading, Text } from '@/components/ui';
import { useTranscriptionHistory } from '../../hooks/useTranscriptionHistory';
import { TranscriptionRecord } from '../../types/transcription';
import { Copy, Trash2, Download } from 'lucide-react';

export function TranscriptionsPage() {
  const {
    history,
    removeTranscription,
    copyToClipboard,
    downloadAudioFile,
    refreshHistory
  } = useTranscriptionHistory();

  // Listen for new transcription events
  useEffect(() => {
    console.log('🔧 Setting up transcription-saved listener for TranscriptionsPage...');
    
    const unlistenTranscriptionSaved = listen('transcription-saved', (event) => {
      const payload = event.payload as { id: string; text: string };
      console.log('📝 Transcription saved event received:', payload);
      refreshHistory();
    });

    console.log('✅ Transcription-saved listener set up successfully');

    return () => {
      console.log('🧹 Cleaning up transcription-saved listener');
      unlistenTranscriptionSaved.then(unlistenFn => unlistenFn());
    };
  }, [refreshHistory]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  const getPreviewText = (text: string) => {
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  };

  const getTitleFromText = (text: string) => {
    // Extract first sentence or first 40 characters as title
    const firstSentence = text.split('.')[0];
    if (firstSentence.length <= 40) {
      return firstSentence;
    }
    return text.substring(0, 40) + '...';
  };

  const handleCopyToClipboard = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      console.log('Text copied to clipboard');
    }
  };

  const handleDownloadAudio = async (item: TranscriptionRecord) => {
    try {
      // Create a filename based on the transcription
      const timestamp = new Date(item.created_at).toISOString().split('T')[0];
      const filename = `murmullo_${timestamp}_${item.id.substring(0, 8)}.wav`;

      // Use the browser's download API
      const audioPath = await downloadAudioFile(item.id, filename);
      if (audioPath) {
        console.log('Audio file downloaded:', filename);
      }
    } catch (error) {
      console.error('Failed to download audio file:', error);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <Container size="lg" padding="sm">
        <Section spacing="md">
          {/* Header */}
          <Flex direction="column" align="center" gap="sm" className="mb-6">
            <Heading level={1} size="2xl" color="default" className="font-semibold">
              Recent Transcriptions
            </Heading>
            <Text size="sm" color="muted" align="center" className="font-light">
              Your latest voice recordings and transcriptions
            </Text>
          </Flex>

          {/* Transcriptions List */}
          {history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <Text size="sm" color="muted" className="font-light">
                No transcriptions yet
              </Text>
              <Text size="xs" color="muted" align="center" className="font-light">
                Start recording to see your transcriptions here
              </Text>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <Heading level={4} size="sm" className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {getTitleFromText(item.text)}
                    </Heading>
                    <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-light">
                      {getTimeAgo(item.created_at)}
                    </Badge>
                  </div>

                  <Text size="sm" color="muted" className="leading-relaxed mb-2 font-light">
                    {getPreviewText(item.text)}
                  </Text>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-xs text-muted-foreground font-light">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(item.duration_ms)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8" />
                        </svg>
                        {formatFileSize(item.file_size_bytes)}
                      </span>
                      <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-muted-foreground/20 font-light">
                        {item.model_used}
                      </Badge>
                      {item.language && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-muted-foreground/20 font-light">
                          {item.language}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyToClipboard(item.text)}
                        className="text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10 font-light flex items-center gap-1"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      <button
                        onClick={() => handleDownloadAudio(item)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-100 font-light flex items-center gap-1"
                      >
                        <Download size={12} />
                        Download
                      </button>
                      <button
                        onClick={() => removeTranscription(item.id)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded hover:bg-destructive/10 font-light flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </Container>
    </div>
  );
}