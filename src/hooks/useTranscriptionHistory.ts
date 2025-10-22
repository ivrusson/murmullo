import { useState, useCallback, useEffect } from 'react';
import { TranscriptionRecord } from '../types/transcription';
import { TranscriptionService } from '../services/transcriptionService';

export const useTranscriptionHistory = () => {
  const [history, setHistory] = useState<TranscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from backend on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const transcriptions = await TranscriptionService.listTranscriptions();
        setHistory(transcriptions);
      } catch (error) {
        console.error('Error loading transcription history:', error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const addTranscription = useCallback(async (
    text: string,
    audioData: number[],
    modelUsed: string,
    language?: string,
    metadata: Record<string, string> = {}
  ) => {
    try {
      const id = await TranscriptionService.saveTranscription(
        text,
        audioData,
        modelUsed,
        language,
        metadata
      );
      
      // Reload history to get the new transcription
      const updatedHistory = await TranscriptionService.listTranscriptions();
      setHistory(updatedHistory);
      
      return id;
    } catch (error) {
      console.error('Error adding transcription:', error);
      throw error;
    }
  }, []);

  const removeTranscription = useCallback(async (id: string) => {
    try {
      const deleted = await TranscriptionService.deleteTranscription(id);
      if (deleted) {
        setHistory(prev => prev.filter(item => item.id !== id));
      }
      return deleted;
    } catch (error) {
      console.error('Error removing transcription:', error);
      throw error;
    }
  }, []);

  const updateTranscription = useCallback(async (
    id: string,
    text?: string,
    metadata?: Record<string, string>
  ) => {
    try {
      const updated = await TranscriptionService.updateTranscription(id, text, metadata);
      if (updated) {
        // Reload history to get the updated transcription
        const updatedHistory = await TranscriptionService.listTranscriptions();
        setHistory(updatedHistory);
      }
      return updated;
    } catch (error) {
      console.error('Error updating transcription:', error);
      throw error;
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      // Delete all transcriptions one by one
      for (const item of history) {
        await TranscriptionService.deleteTranscription(item.id);
      }
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }, [history]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      return false;
    }
  }, []);

  const downloadAudioFile = useCallback(async (id: string, destinationPath: string) => {
    try {
      return await TranscriptionService.downloadAudioFile(id, destinationPath);
    } catch (error) {
      console.error('Error downloading audio file:', error);
      throw error;
    }
  }, []);

  const getAudioFilePath = useCallback(async (id: string) => {
    try {
      return await TranscriptionService.getAudioFilePath(id);
    } catch (error) {
      console.error('Error getting audio file path:', error);
      throw error;
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const transcriptions = await TranscriptionService.listTranscriptions();
      setHistory(transcriptions);
    } catch (error) {
      console.error('Error refreshing history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cleanupOrphanedFiles = useCallback(async () => {
    try {
      const cleanedCount = await TranscriptionService.cleanupOrphanedFiles();
      console.log('Cleaned up orphaned files:', cleanedCount);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      throw error;
    }
  }, []);

  return {
    history,
    isLoading,
    addTranscription,
    removeTranscription,
    updateTranscription,
    clearHistory,
    copyToClipboard,
    downloadAudioFile,
    getAudioFilePath,
    refreshHistory,
    cleanupOrphanedFiles,
  };
};
