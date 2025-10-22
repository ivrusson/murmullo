import React from 'react';

interface WaveformVisualizationProps {
  audioLevel: number; // 0-1 range
}

export const WaveformVisualization: React.FC<WaveformVisualizationProps> = ({ audioLevel }) => {
  const bars = 12;
  const barWidth = 1.5;
  const maxHeight = 12;
  const spacing = 1;

  // Generate bar heights based on audio level with some randomness for natural look
  const generateBarHeights = () => {
    const heights = [];
    for (let i = 0; i < bars; i++) {
      // Add some variation to make it look more natural
      const variation = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
      const height = Math.max(2, audioLevel * maxHeight * variation);
      heights.push(height);
    }
    return heights;
  };

  const barHeights = generateBarHeights();

  return (
    <div className="waveform-container">
      <svg 
        width={bars * (barWidth + spacing) - spacing} 
        height={maxHeight + 4}
        className="waveform-svg"
      >
        <defs>
          <linearGradient id="waveform-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(200, 180, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(180, 255, 200, 0.8)" />
          </linearGradient>
        </defs>
        {barHeights.map((height, index) => (
          <rect
            key={index}
            x={index * (barWidth + spacing)}
            y={maxHeight - height + 2}
            width={barWidth}
            height={height}
            className="waveform-bar"
            style={{
              animationDelay: `${index * 0.05}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
};
