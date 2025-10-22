import React from 'react';
import { WaveformVisualization } from './WaveformVisualization';

export const ErrorState: React.FC<{ error: string }> = ({ error }) => {
  return (
    <div className="floating-bar-state error-state">
      <div className="state-content">
        <div className="error-icon">⚠️</div>
        <span className="state-text">Error</span>
      </div>
      <div className="error-tooltip">{error}</div>
    </div>
  );
};

export const IdleState: React.FC = () => {
  return (
    <div className="floating-bar-state idle-state">
      <div className="state-content">
        <span className="state-text">
          Hold <kbd className="key">⌘</kbd> + <kbd className="key">⌥</kbd> + <kbd className="key">T</kbd> to dictate
        </span>
      </div>
    </div>
  );
};

export const RecordingState: React.FC<{ audioLevel: number }> = ({ audioLevel }) => {
  return (
    <div className="floating-bar-state recording-state">
      <div className="state-content">
        <WaveformVisualization audioLevel={audioLevel} />
        <span className="state-text">Listening...</span>
      </div>
    </div>
  );
};

export const ProcessingState: React.FC = () => {
  return (
    <div className="floating-bar-state processing-state">
      <div className="state-content">
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <span className="state-text">Processing...</span>
      </div>
    </div>
  );
};

export const TranscriptionCompleteState: React.FC<{ transcription: { text: string; duration_ms: number; model_used: string } }> = ({ transcription }) => {
  return (
    <div className="floating-bar-state transcription-complete-state">
      <div className="state-content">
        <div className="transcription-result">
          <span className="transcription-text">"{transcription.text}"</span>
          <div className="transcription-meta">
            <span className="duration">{Math.round(transcription.duration_ms / 1000)}s</span>
            <span className="model">{transcription.model_used}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
