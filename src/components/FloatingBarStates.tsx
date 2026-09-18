import React from 'react';
import { WaveformVisualization } from './WaveformVisualization';

export const ErrorState: React.FC<{ error: string }> = ({ error }) => {
  return (
    <div className="floating-bar-state error-state">
      <div className="hud-pill">
        <div className="rec-chip error">
          <span className="rec-dot" />
          <span className="rec-label">Error</span>
        </div>
        <span className="state-text truncate">{error || 'Algo falló'}</span>
      </div>
    </div>
  );
};

export const IdleState: React.FC<{
  hotkeyParts?: string[];
  onStart?: () => void;
}> = ({ hotkeyParts, onStart }) => {
  const parts =
    hotkeyParts && hotkeyParts.length > 0 ? hotkeyParts : ['Cmd', 'Opt', 'T'];
  return (
    <div className="floating-bar-state idle-state">
      <div className="hud-pill">
        <button type="button" className="hud-btn hud-btn-rec" onClick={onStart}>
          Grabar
        </button>
        <span className="state-text">
          o mantén{' '}
          {parts.map(part => (
            <kbd key={part} className="key">
              {part}
            </kbd>
          ))}
        </span>
        <span className="mic-orb" />
      </div>
    </div>
  );
};

export const RecordingState: React.FC<{
  audioLevel: number;
  onStop?: () => void;
  onCancel?: () => void;
}> = ({ audioLevel, onStop, onCancel }) => {
  return (
    <div className="floating-bar-state recording-state">
      <div className="hud-stack">
        <div className="hud-pill">
          <div className="rec-chip">
            <span className="rec-dot live" />
            <span className="rec-label">REC</span>
          </div>
          <WaveformVisualization audioLevel={audioLevel} />
          <button
            type="button"
            className="hud-btn hud-btn-stop"
            onClick={onStop}
          >
            Parar
          </button>
          <button
            type="button"
            className="hud-btn hud-btn-cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
        <div className="hud-sub">
          <span className="hud-sub-kicker">Micrófono de sistema</span>
          <span className="hud-sub-live">Parar envía a nemo-speech</span>
        </div>
      </div>
    </div>
  );
};

export const ProcessingState: React.FC<{ message?: string }> = ({
  message,
}) => {
  return (
    <div className="floating-bar-state processing-state">
      <div className="hud-stack">
        <div className="hud-pill">
          <div className="ai-orb" />
          <div className="ai-copy">
            <span className="state-text">
              {message || 'Enviando a nemo-speech'}
            </span>
            <span className="ai-sub">localhost:18765 · Parakeet Q8</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TranscriptionCompleteState: React.FC<{
  transcription: { text: string; duration_ms: number; model_used: string };
}> = ({ transcription }) => {
  const seconds = Math.max(1, Math.round(transcription.duration_ms / 1000));
  return (
    <div className="floating-bar-state transcription-complete-state">
      <div className="hud-stack">
        <div className="hud-pill">
          <div className="ok-orb">✓</div>
          <div className="complete-copy">
            <span className="transcription-text">"{transcription.text}"</span>
            <span className="ai-sub">
              {seconds}s · {transcription.model_used}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
