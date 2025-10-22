import React, { useRef, useEffect, useCallback } from 'react';

interface AudioBubbleProps {
  audioLevel: number;
  isRecording: boolean;
  size?: number;
}

export const AudioBubble: React.FC<AudioBubbleProps> = ({
  audioLevel,
  isRecording,
  size = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>([]);
  const numBars = 8;
  const barWidth = 3;
  const barSpacing = 4;

  const drawBars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Update bars with audio level
    if (isRecording) {
      barsRef.current = barsRef.current.map((bar) => {
        // Add some randomness to make it more organic
        const randomFactor = 0.7 + Math.random() * 0.6;
        const newHeight = Math.min(1, audioLevel * randomFactor);
        
        // Smooth transition
        return bar + (newHeight - bar) * 0.3;
      });
    } else {
      // Fade out when not recording
      barsRef.current = barsRef.current.map(bar => bar * 0.9);
    }

    // Draw bars
    const centerX = size / 2;
    const centerY = size / 2;
    const totalWidth = (numBars * barWidth) + ((numBars - 1) * barSpacing);
    const startX = centerX - totalWidth / 2;

    barsRef.current.forEach((height, index) => {
      const x = startX + index * (barWidth + barSpacing);
      const barHeight = Math.max(2, height * (size * 0.6));
      const y = centerY - barHeight / 2;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      
      if (isRecording) {
        gradient.addColorStop(0, '#000');
        gradient.addColorStop(1, '#333');
      } else {
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(1, '#999');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    });

    // Continue animation
    animationRef.current = requestAnimationFrame(drawBars);
  }, [audioLevel, isRecording, size]);

  useEffect(() => {
    // Initialize bars
    barsRef.current = new Array(numBars).fill(0);
    drawBars();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawBars]);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: isRecording ? '#f0f0f0' : '#f8f9fa',
      border: `2px solid ${isRecording ? '#000' : '#e9ecef'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      boxShadow: isRecording ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
        }}
      />
    </div>
  );
};
