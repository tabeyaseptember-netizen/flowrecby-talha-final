import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Pause, 
  Play, 
  Square, 
  Mic, 
  MicOff, 
  Camera,
  MousePointer2
} from 'lucide-react';

interface PiPControllerProps {
  duration: number;
  isPaused: boolean;
  isMicOn: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleMic: () => void;
  onScreenshot: () => void;
  onToggleClickAnimation: () => void;
  clickAnimationEnabled: boolean;
  screenStream: MediaStream | null;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * PiPController - Canvas-based Picture-in-Picture controller
 * 
 * This component creates a canvas-based video that can enter PiP mode,
 * displaying recording controls that remain visible even when switching
 * tabs or applications. This is the web platform's best solution for
 * persistent recording controls.
 * 
 * IMPORTANT: The controls are rendered TO the canvas and displayed in PiP.
 * User interaction happens through the main window's floating controls.
 */
export const PiPController = ({
  duration,
  isPaused,
  isMicOn,
  onPause,
  onResume,
  onStop,
  onToggleMic,
  onScreenshot,
  onToggleClickAnimation,
  clickAnimationEnabled,
  screenStream,
}: PiPControllerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  // Draw control panel to canvas
  const drawControls = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw gradient header
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 50);

    // Recording indicator
    ctx.beginPath();
    ctx.arc(25, 25, 8, 0, Math.PI * 2);
    ctx.fillStyle = isPaused ? '#f59e0b' : '#ef4444';
    ctx.fill();

    // Animate recording dot
    if (!isPaused) {
      const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(25, 25, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Timer text
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(formatDuration(duration), 50, 32);

    // Status text
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(isPaused ? 'PAUSED' : 'RECORDING', width - 15, 32);

    // Draw control buttons area
    const buttonY = 70;
    const buttonSize = 50;
    const buttonGap = 15;
    const buttons = [
      { icon: isPaused ? '▶' : '⏸', label: isPaused ? 'Resume' : 'Pause', color: isPaused ? '#22c55e' : '#f59e0b' },
      { icon: '⏹', label: 'Stop', color: '#ef4444' },
      { icon: '📸', label: 'Screenshot', color: '#3b82f6' },
      { icon: isMicOn ? '🎤' : '🔇', label: isMicOn ? 'Mic On' : 'Mic Off', color: isMicOn ? '#22c55e' : '#6b7280' },
    ];

    const totalWidth = buttons.length * buttonSize + (buttons.length - 1) * buttonGap;
    let startX = (width - totalWidth) / 2;

    buttons.forEach((btn) => {
      // Button background
      ctx.fillStyle = '#2d2d44';
      ctx.beginPath();
      ctx.roundRect(startX, buttonY, buttonSize, buttonSize, 10);
      ctx.fill();

      // Button border
      ctx.strokeStyle = btn.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Button icon
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(btn.icon, startX + buttonSize / 2, buttonY + buttonSize / 2 + 8);

      startX += buttonSize + buttonGap;
    });

    // Instructions
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Use main window controls to interact', width / 2, height - 15);

    animationRef.current = requestAnimationFrame(drawControls);
  }, [duration, isPaused, isMicOn]);

  // Setup canvas and start drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 320;
    canvas.height = 160;

    drawControls();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawControls]);

  // Create video stream from canvas for PiP
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    video.muted = true;
    video.play().catch(console.error);
  }, []);

  // Auto-enable PiP when component mounts
  useEffect(() => {
    const enablePiP = async () => {
      const video = videoRef.current;
      if (!video || !document.pictureInPictureEnabled) return;

      try {
        // Small delay to ensure video is playing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (video.readyState >= 2 && !document.pictureInPictureElement) {
          await video.requestPictureInPicture();
          setIsPipActive(true);
        }
      } catch (err) {
        console.warn('Could not auto-enable PiP:', err);
      }
    };

    enablePiP();
  }, []);

  // Handle PiP events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPipActive(true);
    const handleLeavePiP = () => setIsPipActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP toggle error:', err);
    }
  };

  return (
    <>
      {/* Hidden canvas for rendering controls */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', left: -9999, top: -9999 }}
      />
      
      {/* Hidden video for PiP */}
      <video
        ref={videoRef}
        style={{ position: 'fixed', left: -9999, top: -9999, width: 1, height: 1 }}
        playsInline
        muted
      />
    </>
  );
};
