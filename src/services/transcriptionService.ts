import { invoke } from '@tauri-apps/api/core';
import type { TranscriptionRecord, TranscriptionResult } from '../types/transcription';

export class TranscriptionService {
  /**
   * Save a transcription with audio data
   */
  static async saveTranscription(
    text: string,
    audioData: number[],
    modelUsed: string,
    language?: string,
    metadata: Record<string, string> = {}
  ): Promise<string> {
    try {
      const id = await invoke<string>('save_transcription', {
        text,
        audioData,
        modelUsed,
        language,
        metadata,
      });
      
      console.log('✅ Transcription saved with ID:', id);
      return id;
    } catch (error) {
      console.error('❌ Failed to save transcription:', error);
      throw error;
    }
  }

  /**
   * List all transcriptions
   */
  static async listTranscriptions(): Promise<TranscriptionRecord[]> {
    try {
      const transcriptions = await invoke<TranscriptionRecord[]>('list_transcriptions');
      console.log('📋 Loaded transcriptions:', transcriptions.length);
      return transcriptions;
    } catch (error) {
      console.error('❌ Failed to list transcriptions:', error);
      throw error;
    }
  }

  /**
   * Get a specific transcription by ID
   */
  static async getTranscription(id: string): Promise<TranscriptionRecord | null> {
    try {
      const transcription = await invoke<TranscriptionRecord | null>('get_transcription', { id });
      return transcription;
    } catch (error) {
      console.error('❌ Failed to get transcription:', error);
      throw error;
    }
  }

  /**
   * Delete a transcription and its audio file
   */
  static async deleteTranscription(id: string): Promise<boolean> {
    try {
      const deleted = await invoke<boolean>('delete_transcription', { id });
      if (deleted) {
        console.log('✅ Transcription deleted:', id);
      } else {
        console.log('❌ Transcription not found:', id);
      }
      return deleted;
    } catch (error) {
      console.error('❌ Failed to delete transcription:', error);
      throw error;
    }
  }

  /**
   * Update transcription text or metadata
   */
  static async updateTranscription(
    id: string,
    text?: string,
    metadata?: Record<string, string>
  ): Promise<boolean> {
    try {
      const updated = await invoke<boolean>('update_transcription', {
        id,
        text,
        metadata,
      });
      
      if (updated) {
        console.log('✅ Transcription updated:', id);
      } else {
        console.log('❌ Transcription not found:', id);
      }
      return updated;
    } catch (error) {
      console.error('❌ Failed to update transcription:', error);
      throw error;
    }
  }

  /**
   * Download audio file to a specific location
   */
  static async downloadAudioFile(id: string, destinationPath: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('download_audio_file', {
        id,
        destinationPath,
      });
      
      if (success) {
        console.log('✅ Audio file downloaded to:', destinationPath);
      } else {
        console.log('❌ Audio file not found for transcription:', id);
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to download audio file:', error);
      throw error;
    }
  }

  /**
   * Get the path to an audio file
   */
  static async getAudioFilePath(id: string): Promise<string | null> {
    try {
      const path = await invoke<string | null>('get_audio_file_path', { id });
      return path;
    } catch (error) {
      console.error('❌ Failed to get audio file path:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned audio files
   */
  static async cleanupOrphanedFiles(): Promise<number> {
    try {
      const cleanedCount = await invoke<number>('cleanup_orphaned_files');
      console.log('🧹 Cleaned up orphaned files:', cleanedCount);
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned files:', error);
      throw error;
    }
  }

  /**
   * Get the recordings directory path
   */
  static async getRecordingsDirectory(): Promise<string> {
    try {
      const directory = await invoke<string>('get_recordings_directory');
      return directory;
    } catch (error) {
      console.error('❌ Failed to get recordings directory:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio data (existing function)
   */
  static async transcribeAudio(audioData: number[]): Promise<TranscriptionResult> {
    try {
      const result = await invoke<TranscriptionResult>('transcribe_audio', {
        audioData,
      });
      return result;
    } catch (error) {
      console.error('❌ Failed to transcribe audio:', error);
      throw error;
    }
  }

  /**
   * Set transcription language
   */
  static async setLanguage(language?: string): Promise<void> {
    try {
      await invoke('set_transcription_language', { language });
      console.log('🌍 Language set to:', language || 'auto');
    } catch (error) {
      console.error('❌ Failed to set language:', error);
      throw error;
    }
  }
}
