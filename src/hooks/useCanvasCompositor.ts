import { useRef, useCallback, useEffect } from 'react';
import { CameraShape } from '@/contexts/RecordingContext';

interface CompositorOptions {
  webcamEnabled: boolean;
  webcamShape: CameraShape;
  webcamPosition: { x: number; y: number };
  webcamSize: 'small' | 'medium' | 'large';
}

interface CompositorResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  compositeStream: MediaStream | null;
  startCompositing: (screenStream: MediaStream, webcamStream: MediaStream | null) => void;
  stopCompositing: () => void;
  updateWebcamPosition: (x: number, y: number) => void;
  updateWebcamSize: (size: 'small' | 'medium' | 'large') => void;
}

/**
 * useCanvasCompositor - Composites screen and webcam streams using canvas
 * 
 * This hook handles the real-time merging of screen recording and webcam feed
 * into a single video stream. The webcam appears as an overlay (bubble) on the
 * recorded output, similar to Loom or Screenity.
 * 
 * IMPORTANT: This is the ONLY way to get webcam in the final recording on web.
 * The webcam overlay must be painted onto a canvas that becomes the recorded stream.
 */
export const useCanvasCompositor = (options: CompositorOptions): CompositorResult => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const optionsRef = useRef(options);
  
  // Keep options in sync
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const getWebcamDimensions = useCallback((canvasWidth: number, canvasHeight: number) => {
    const sizeMultipliers = {
      small: 0.12,
      medium: 0.18,
      large: 0.24,
    };
    
    const multiplier = sizeMultipliers[optionsRef.current.webcamSize];
    const baseSize = Math.min(canvasWidth, canvasHeight) * multiplier;
    
    if (optionsRef.current.webcamShape === 'circle') {
      return { width: baseSize, height: baseSize, radius: baseSize / 2 };
    } else {
      return { width: baseSize * 1.33, height: baseSize, radius: 16 };
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const screenVideo = screenVideoRef.current;
    
    if (!canvas || !ctx || !screenVideo) {
      animationFrameRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    // Draw screen capture
    if (screenVideo.readyState >= 2) {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    }

    // Draw webcam overlay if enabled
    const webcamVideo = webcamVideoRef.current;
    const opts = optionsRef.current;
    
    if (opts.webcamEnabled && webcamVideo && webcamVideo.readyState >= 2) {
      const dims = getWebcamDimensions(canvas.width, canvas.height);
      const padding = 20;
      
      // Calculate position (bottom-right by default, adjustable)
      const x = canvas.width - dims.width - padding - opts.webcamPosition.x;
      const y = canvas.height - dims.height - padding - opts.webcamPosition.y;
      
      ctx.save();
      
      // Create clipping path for shape
      ctx.beginPath();
      if (opts.webcamShape === 'circle') {
        ctx.arc(x + dims.width / 2, y + dims.height / 2, dims.radius, 0, Math.PI * 2);
      } else {
        ctx.roundRect(x, y, dims.width, dims.height, dims.radius);
      }
      ctx.clip();
      
      // Draw mirrored webcam (flip horizontally for natural selfie view)
      ctx.translate(x + dims.width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(webcamVideo, 0, 0, dims.width, dims.height);
      
      ctx.restore();
      
      // Draw border ring
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (opts.webcamShape === 'circle') {
        ctx.arc(x + dims.width / 2, y + dims.height / 2, dims.radius, 0, Math.PI * 2);
      } else {
        ctx.roundRect(x, y, dims.width, dims.height, dims.radius);
      }
      ctx.stroke();
      ctx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(drawFrame);
  }, [getWebcamDimensions]);

  const startCompositing = useCallback((screenStream: MediaStream, webcamStream: MediaStream | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get screen video dimensions
    const videoTrack = screenStream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;

    // Create screen video element
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.play().catch(console.error);
    screenVideoRef.current = screenVideo;

    // Create webcam video element if stream provided
    if (webcamStream) {
      const webcamVideo = document.createElement('video');
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      webcamVideo.playsInline = true;
      webcamVideo.play().catch(console.error);
      webcamVideoRef.current = webcamVideo;
    }

    // Start the animation loop
    drawFrame();

    // Create composite stream from canvas
    const canvasStream = canvas.captureStream(30);
    
    // Add audio tracks from original screen stream
    screenStream.getAudioTracks().forEach(track => {
      canvasStream.addTrack(track);
    });
    
    compositeStreamRef.current = canvasStream;
  }, [drawFrame]);

  const stopCompositing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
      screenVideoRef.current = null;
    }

    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
      webcamVideoRef.current = null;
    }

    compositeStreamRef.current = null;
  }, []);

  const updateWebcamPosition = useCallback((x: number, y: number) => {
    optionsRef.current = { ...optionsRef.current, webcamPosition: { x, y } };
  }, []);

  const updateWebcamSize = useCallback((size: 'small' | 'medium' | 'large') => {
    optionsRef.current = { ...optionsRef.current, webcamSize: size };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCompositing();
    };
  }, [stopCompositing]);

  return {
    canvasRef,
    compositeStream: compositeStreamRef.current,
    startCompositing,
    stopCompositing,
    updateWebcamPosition,
    updateWebcamSize,
  };
};
