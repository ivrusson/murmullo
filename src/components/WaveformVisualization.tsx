import React, { useMemo } from 'react';

interface WaveformVisualizationProps {
  audioLevel: number; // 0-1 range
}

export const WaveformVisualization: React.FC<WaveformVisualizationProps> = ({
  audioLevel,
}) => {
  const bars = 16;
  const barWidth = 2;
  const maxHeight = 16;
  const spacing = 1.5;
  const visual = Math.min(1, Math.pow(Math.max(audioLevel, 0), 0.55));

  const barHeights = useMemo(() => {
    return Array.from({ length: bars }, (_, i) => {
      const envelope = 0.35 + 0.65 * Math.sin((i / (bars - 1)) * Math.PI);
      const wobble = 0.75 + 0.25 * Math.sin(i * 1.7 + visual * 9);
      return Math.max(2, visual * maxHeight * envelope * wobble);
    });
  }, [visual]);

  return (
    <div className="waveform-container">
      <svg
        width={bars * (barWidth + spacing) - spacing}
        height={maxHeight + 4}
        className="waveform-svg"
      >
        <defs>
          <linearGradient
            id="waveform-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#C9955A" />
            <stop offset="100%" stopColor="#4F9B8C" />
          </linearGradient>
        </defs>
        {barHeights.map((height, index) => (
          <rect
            key={index}
            x={index * (barWidth + spacing)}
            y={maxHeight - height + 2}
            width={barWidth}
            height={height}
            rx={1}
            className="waveform-bar"
          />
        ))}
      </svg>
    </div>
  );
};
