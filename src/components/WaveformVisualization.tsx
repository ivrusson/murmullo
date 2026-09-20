import { useMemo } from 'react';

interface WaveformVisualizationProps {
  audioLevel: number;
  bars?: number;
  barWidth?: number;
}

export function WaveformVisualization({
  audioLevel,
  bars = 22,
  barWidth = 2.5,
}: WaveformVisualizationProps) {
  const maxHeight = 18;
  const spacing = 2.2;
  const visual = Math.min(1, Math.pow(Math.max(audioLevel, 0), 0.55));

  const barHeights = useMemo(() => {
    return Array.from({ length: bars }, (_, i) => {
      const envelope =
        0.35 + 0.65 * Math.sin((i / Math.max(bars - 1, 1)) * Math.PI);
      const wobble = 0.75 + 0.25 * Math.sin(i * 1.7 + visual * 9);
      return Math.max(2.5, visual * maxHeight * envelope * wobble);
    });
  }, [bars, visual]);

  return (
    <div className="waveform-container">
      <svg
        width={bars * (barWidth + spacing) - spacing}
        height={maxHeight + 4}
        className="waveform-svg"
        aria-hidden
      >
        {barHeights.map((height, index) => (
          <rect
            key={index}
            className="waveform-bar"
            x={index * (barWidth + spacing)}
            y={maxHeight - height + 2}
            width={barWidth}
            height={height}
            rx={barWidth / 2}
          />
        ))}
      </svg>
    </div>
  );
}
