import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioLevelIndicatorProps {
  stream: MediaStream | null;
  type: 'mic' | 'system';
  label: string;
  isActive: boolean;
}

/**
 * AudioLevelIndicator - Real-time audio level visualization
 * Shows a moving bar graph of audio input levels
 */
export const AudioLevelIndicator = ({ stream, type, label, isActive }: AudioLevelIndicatorProps) => {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      return;
    }

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        
        setLevel(normalizedLevel);
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        audioContext.close();
        analyserRef.current = null;
      };
    } catch (err) {
      console.warn('Could not create audio analyzer:', err);
    }
  }, [stream, isActive]);

  const Icon = type === 'mic' ? Mic : Volume2;
  
  // Create level bars
  const bars = 8;
  const activeBars = Math.ceil((level / 100) * bars);

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg transition-all",
      isActive ? "bg-secondary" : "bg-muted/50 opacity-50"
    )}>
      <Icon className={cn(
        "w-4 h-4",
        isActive && level > 10 ? "text-primary" : "text-muted-foreground"
      )} />
      
      <div className="flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: bars }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-sm",
                i < activeBars
                  ? i < bars * 0.6
                    ? "bg-success"
                    : i < bars * 0.8
                    ? "bg-warning"
                    : "bg-recording"
                  : "bg-muted"
              )}
              initial={false}
              animate={{
                scaleY: i < activeBars ? 1 : 0.5,
              }}
              transition={{ duration: 0.05 }}
            />
          ))}
        </div>
      </div>
      
      {isActive && (
        <span className={cn(
          "text-[10px] font-mono min-w-[24px] text-right",
          level > 80 ? "text-recording" : level > 50 ? "text-warning" : "text-muted-foreground"
        )}>
          {Math.round(level)}%
        </span>
      )}
    </div>
  );
};