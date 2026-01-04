import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { 
  saveRecording, 
  loadRecordings, 
  deleteStoredRecording, 
  saveScreenshot, 
  loadScreenshots, 
  deleteStoredScreenshot 
} from '@/hooks/useLocalStorage';

export type ScreenSource = 'screen' | 'window' | 'tab';
export type AudioSource = 'mic' | 'system' | 'both' | 'none';
export type CameraShape = 'circle' | 'rounded' | 'square';
export type RecordingQuality = '720p' | '1080p' | '2k';
export type RecordingFPS = 30 | 60;
export type WebcamSize = 'small' | 'medium' | 'large';
export type WebcamCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface Screenshot {
  id: string;
  url: string;
  timestamp: Date;
  blob: Blob;
}

export interface CanvasOverlay {
  id: string;
  imageData: string; // base64 encoded image
  timestamp: Date;
  width: number;
  height: number;
}

export interface Recording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  thumbnail?: string;
  resolution: string;
  size: number;
  canvasOverlays?: CanvasOverlay[];
}

interface RecordingSettings {
  screenSource: ScreenSource;
  audioSource: AudioSource;
  cameraEnabled: boolean;
  cameraShape: CameraShape;
  quality: RecordingQuality;
  fps: RecordingFPS;
  showCursor: boolean;
  clickAnimation: boolean;
  cursorSpotlight: boolean;
  keystrokeDisplay: boolean;
  webcamSize: WebcamSize;
  webcamCorner: WebcamCorner;
  webcamBorder: boolean;
  webcamShadow: boolean;
  webcamMirror: boolean;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  settings: RecordingSettings;
  recordings: Recording[];
  screenshots: Screenshot[];
  canvasOverlays: CanvasOverlay[];
  cameraStream: MediaStream | null;
  isPipActive: boolean;
  isUIHidden: boolean;
  screenStream: MediaStream | null;
}

interface RecordingContextType extends RecordingState {
  updateSettings: (settings: Partial<RecordingSettings>) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  deleteRecording: (id: string) => void;
  deleteScreenshot: (id: string) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  takeScreenshot: () => Promise<void>;
  enablePip: () => Promise<void>;
  disablePip: () => void;
  toggleMic: () => void;
  addRecording: (recording: Recording) => void;
  addCanvasOverlay: (imageData: string, width: number, height: number) => void;
  clearCanvasOverlays: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const defaultSettings: RecordingSettings = {
  screenSource: 'screen',
  audioSource: 'both',
  cameraEnabled: false,
  cameraShape: 'circle',
  quality: '1080p',
  fps: 30,
  showCursor: true,
  clickAnimation: true,
  cursorSpotlight: false,
  keystrokeDisplay: false,
  webcamSize: 'medium',
  webcamCorner: 'bottom-right',
  webcamBorder: true,
  webcamShadow: true,
  webcamMirror: true,
};

const RecordingContext = createContext<RecordingContextType | null>(null);

export const useRecording = () => {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
};

export const RecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [settings, setSettings] = useState<RecordingSettings>(defaultSettings);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [canvasOverlays, setCanvasOverlays] = useState<CanvasOverlay[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isUIHidden, setIsUIHidden] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load recordings and screenshots from IndexedDB on mount
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const [storedRecordings, storedScreenshots] = await Promise.all([
          loadRecordings(),
          loadScreenshots()
        ]);
        setRecordings(storedRecordings);
        setScreenshots(storedScreenshots);
      } catch (err) {
        console.error('Failed to load stored data:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadStoredData();
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const durationRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  const updateSettings = useCallback((newSettings: Partial<RecordingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getQualityConstraints = useCallback(() => {
    switch (settings.quality) {
      case '720p':
        return { width: 1280, height: 720 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '2k':
        return { width: 2560, height: 1440 };
      default:
        return { width: 1920, height: 1080 };
    }
  }, [settings.quality]);

  // Canvas compositing for webcam overlay
  const drawCompositeFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const screenVideo = screenVideoRef.current;

    if (!canvas || !ctx || !screenVideo || screenVideo.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(drawCompositeFrame);
      return;
    }

    // Draw screen capture
    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

    // Draw webcam overlay if enabled
    const webcamVideo = webcamVideoRef.current;
    if (settings.cameraEnabled && webcamVideo && webcamVideo.readyState >= 2) {
      const sizeMultipliers = { small: 0.12, medium: 0.18, large: 0.24 };
      const multiplier = sizeMultipliers[settings.webcamSize];
      const baseSize = Math.min(canvas.width, canvas.height) * multiplier;
      
      // Calculate dimensions based on shape
      const getBorderRadius = () => {
        if (settings.cameraShape === 'circle') return baseSize / 2;
        if (settings.cameraShape === 'rounded') return 16;
        return 0; // square
      };
      
      const dims = settings.cameraShape === 'circle' 
        ? { width: baseSize, height: baseSize, radius: baseSize / 2 }
        : { width: baseSize * 1.33, height: baseSize, radius: getBorderRadius() };
      
      const padding = 20;
      
      // Calculate position based on corner setting
      let x: number, y: number;
      switch (settings.webcamCorner) {
        case 'bottom-left':
          x = padding;
          y = canvas.height - dims.height - padding;
          break;
        case 'top-right':
          x = canvas.width - dims.width - padding;
          y = padding;
          break;
        case 'top-left':
          x = padding;
          y = padding;
          break;
        case 'bottom-right':
        default:
          x = canvas.width - dims.width - padding;
          y = canvas.height - dims.height - padding;
          break;
      }

      ctx.save();

      // Draw shadow if enabled
      if (settings.webcamShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
      }

      // Create clipping path for shape
      ctx.beginPath();
      if (settings.cameraShape === 'circle') {
        ctx.arc(x + dims.width / 2, y + dims.height / 2, dims.radius, 0, Math.PI * 2);
      } else {
        ctx.roundRect(x, y, dims.width, dims.height, dims.radius);
      }
      ctx.clip();

      // Draw webcam (mirror if enabled)
      if (settings.webcamMirror) {
        ctx.translate(x + dims.width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(webcamVideo, 0, 0, dims.width, dims.height);
      } else {
        ctx.drawImage(webcamVideo, x, y, dims.width, dims.height);
      }

      ctx.restore();

      // Draw border if enabled
      if (settings.webcamBorder) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (settings.cameraShape === 'circle') {
          ctx.arc(x + dims.width / 2, y + dims.height / 2, dims.radius, 0, Math.PI * 2);
        } else {
          ctx.roundRect(x, y, dims.width, dims.height, dims.radius);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    animationFrameRef.current = requestAnimationFrame(drawCompositeFrame);
  }, [settings.cameraEnabled, settings.cameraShape, settings.webcamSize, settings.webcamCorner, settings.webcamBorder, settings.webcamShadow, settings.webcamMirror]);

  // Take screenshot from current video frame
  const takeScreenshot = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording) {
      toast({
        title: "Screenshot Failed",
        description: "No active recording to capture",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });

      const url = URL.createObjectURL(blob);
      const screenshot: Screenshot = {
        id: Date.now().toString(),
        url,
        timestamp: new Date(),
        blob,
      };

      // Save to IndexedDB
      await saveScreenshot(screenshot);
      
      setScreenshots(prev => [screenshot, ...prev]);

      toast({
        title: "Screenshot Captured",
        description: "Saved to your library",
      });
    } catch (err) {
      console.error('Screenshot error:', err);
      toast({
        title: "Screenshot Failed",
        description: "Could not capture screenshot",
        variant: "destructive",
      });
    }
  }, [isRecording]);

  // Toggle microphone during recording
  const toggleMic = useCallback(() => {
    const newAudioSource = (() => {
      if (settings.audioSource === 'mic') return 'none';
      if (settings.audioSource === 'both') return 'system';
      if (settings.audioSource === 'system') return 'both';
      return 'mic';
    })();
    updateSettings({ audioSource: newAudioSource });
  }, [settings.audioSource, updateSettings]);

  // Enable Picture-in-Picture mode
  const enablePip = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn('PiP not available:', err);
    }
  }, []);

  // Disable Picture-in-Picture mode
  const disablePip = useCallback(() => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(console.error);
      setIsPipActive(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          ...getQualityConstraints(),
          frameRate: settings.fps,
        },
        audio: settings.audioSource === 'system' || settings.audioSource === 'both' 
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              // Keep system audio clean, no processing
            } as MediaTrackConstraints
          : false,
      };

      const displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      setScreenStream(displayStream);

      // Hide UI immediately after permission granted
      setIsUIHidden(true);
      toast({
        title: "Recording Started",
        description: "App UI hidden. Use floating controls.",
      });

      // Setup canvas for compositing
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      const videoTrack = displayStream.getVideoTracks()[0];
      const trackSettings = videoTrack.getSettings();
      canvas.width = trackSettings.width || 1920;
      canvas.height = trackSettings.height || 1080;

      // Create screen video element
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = displayStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      await screenVideo.play();
      screenVideoRef.current = screenVideo;

      // Setup webcam if enabled
      if (settings.cameraEnabled) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          });
          setCameraStream(webcamStream);

          const webcamVideo = document.createElement('video');
          webcamVideo.srcObject = webcamStream;
          webcamVideo.muted = true;
          webcamVideo.playsInline = true;
          await webcamVideo.play();
          webcamVideoRef.current = webcamVideo;
        } catch (err) {
          console.warn('Could not access webcam:', err);
        }
      }

      // Start canvas animation loop
      drawCompositeFrame();

      // Create composite stream from canvas
      const canvasStream = canvas.captureStream(settings.fps);

      // Setup audio with proper mixing using AudioContext
      const audioContext = new AudioContext();
      
      // Resume AudioContext if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed from suspended state');
      }
      
      const destination = audioContext.createMediaStreamDestination();
      
      let hasAudioTracks = false;
      let hasSystemAudio = false;

      // System audio from display stream (only if system or both is selected)
      if (settings.audioSource === 'system' || settings.audioSource === 'both') {
        const systemAudioTracks = displayStream.getAudioTracks();
        console.log('System audio tracks found:', systemAudioTracks.length);
        
        if (systemAudioTracks.length > 0) {
          const systemStream = new MediaStream(systemAudioTracks);
          const systemSource = audioContext.createMediaStreamSource(systemStream);
          
          // Add gain control for system audio
          const systemGain = audioContext.createGain();
          systemGain.gain.value = 1.0;
          
          systemSource.connect(systemGain);
          systemGain.connect(destination);
          hasAudioTracks = true;
          hasSystemAudio = true;
          console.log('✓ System audio connected successfully');
          
          toast({
            title: "System Audio Active",
            description: "Desktop audio is being recorded",
          });
        } else {
          console.warn('No system audio tracks - user did not share audio');
          toast({
            title: "No System Audio",
            description: "You didn't check 'Share audio'. Only screen video will be recorded.",
            variant: "destructive",
          });
        }
      }

      // Microphone audio with enhanced noise reduction
      if (settings.audioSource === 'mic' || settings.audioSource === 'both') {
        try {
          console.log('Requesting microphone access...');
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              // Advanced constraints for better audio quality
              sampleRate: { ideal: 48000 },
              channelCount: { ideal: 1 },
            },
          });
          
          console.log('Microphone access granted, tracks:', micStream.getAudioTracks().length);
          const micSource = audioContext.createMediaStreamSource(micStream);
          
          // Apply noise gate to reduce background hiss
          const micGain = audioContext.createGain();
          micGain.gain.value = settings.audioSource === 'both' ? 0.8 : 1.0;
          
          // High-pass filter to reduce low-frequency rumble/hum
          const highpassFilter = audioContext.createBiquadFilter();
          highpassFilter.type = 'highpass';
          highpassFilter.frequency.value = 80; // Cut frequencies below 80Hz
          
          // Low-pass filter to reduce high-frequency hiss
          const lowpassFilter = audioContext.createBiquadFilter();
          lowpassFilter.type = 'lowpass';
          lowpassFilter.frequency.value = 12000; // Cut frequencies above 12kHz
          
          // Compressor to even out loud/quiet sounds
          const compressor = audioContext.createDynamicsCompressor();
          compressor.threshold.value = -24;
          compressor.knee.value = 30;
          compressor.ratio.value = 4;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.25;
          
          // Connect the audio processing chain
          micSource.connect(highpassFilter);
          highpassFilter.connect(lowpassFilter);
          lowpassFilter.connect(compressor);
          compressor.connect(micGain);
          micGain.connect(destination);
          
          hasAudioTracks = true;
          console.log('✓ Microphone connected with noise reduction');
          
          toast({
            title: "Microphone Active",
            description: "Your voice is being recorded",
          });
        } catch (err) {
          console.error('Microphone access error:', err);
          toast({
            title: "Microphone Error",
            description: err instanceof Error ? err.message : "Could not access microphone. Check browser permissions.",
            variant: "destructive",
          });
        }
      }
      
      // Log final audio status
      console.log('Audio setup complete:', {
        hasAudioTracks,
        hasSystemAudio: hasSystemAudio || false,
        audioContextState: audioContext.state,
        destinationTracks: destination.stream.getAudioTracks().length
      });

      // Add mixed audio track to canvas stream
      if (hasAudioTracks && settings.audioSource !== 'none') {
        destination.stream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });
      }
      
      // Store audio context ref for cleanup
      const audioContextRef = audioContext;

      streamRef.current = canvasStream;

      // Setup video element for PiP
      if (videoRef.current) {
        videoRef.current.srcObject = canvasStream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.error);
      }

      // Determine supported mime type - prefer VP8 for better real-time performance
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp9',
        'video/webm',
      ];

      let selectedMimeType = 'video/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      // Use higher bitrate for smoother recording
      const videoBitrate = settings.quality === '2k' ? 8000000 : 
                          settings.quality === '1080p' ? 5000000 : 2500000;

      const mediaRecorder = new MediaRecorder(canvasStream, { 
        mimeType: selectedMimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: 128000, // 128kbps for clear audio
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      pauseStartRef.current = null;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const finalDuration = durationRef.current;

        const newRecording: Recording = {
          id: Date.now().toString(),
          blob,
          url,
          duration: finalDuration,
          timestamp: new Date(),
          resolution: settings.quality,
          size: blob.size,
        };

        // Save to IndexedDB
        saveRecording(newRecording).catch(err => {
          console.error('Failed to save recording:', err);
        });
        
        setRecordings(prev => [newRecording, ...prev]);

        // Cleanup
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // Close AudioContext
        audioContextRef.close().catch(console.error);

        displayStream.getTracks().forEach(track => track.stop());
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
          screenVideoRef.current = null;
        }

        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = null;
          webcamVideoRef.current = null;
        }

        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        // Exit PiP
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(console.error);
        }
        setIsPipActive(false);
        setScreenStream(null);

        // Restore UI
        setIsUIHidden(false);

        toast({
          title: "Recording Saved",
          description: `${formatDuration(finalDuration)} recording saved to library`,
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      // Use smaller timeslice (100ms) for smoother recording with less buffering delay
      mediaRecorder.start(100);

      setIsRecording(true);
      setDuration(0);
      durationRef.current = 0;

      // Accurate duration tracking
      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current !== null && pauseStartRef.current === null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
          setDuration(elapsed);
          durationRef.current = elapsed;
        }
      }, 100);

      // Handle stream end
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // Auto-enable PiP
      setTimeout(() => {
        enablePip();
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setIsUIHidden(false);
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [settings, getQualityConstraints, drawCompositeFrame, enablePip, cameraStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      startTimeRef.current = null;
      pausedDurationRef.current = 0;
      pauseStartRef.current = null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pauseStartRef.current = Date.now();

      toast({
        title: "Recording Paused",
        description: "Press Ctrl+Shift+P to resume",
      });
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      if (pauseStartRef.current !== null) {
        pausedDurationRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }

      toast({
        title: "Recording Resumed",
        description: "Recording is now in progress",
      });
    }
  }, [isRecording, isPaused]);

  // Note: Keyboard shortcuts are handled by useKeyboardShortcuts hook

  // Handle PiP events
  useEffect(() => {
    const handlePipEnter = () => setIsPipActive(true);
    const handlePipLeave = () => setIsPipActive(false);

    if (videoRef.current) {
      videoRef.current.addEventListener('enterpictureinpicture', handlePipEnter);
      videoRef.current.addEventListener('leavepictureinpicture', handlePipLeave);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('enterpictureinpicture', handlePipEnter);
        videoRef.current.removeEventListener('leavepictureinpicture', handlePipLeave);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const deleteRecording = useCallback((id: string) => {
    // Delete from IndexedDB
    deleteStoredRecording(id).catch(err => {
      console.error('Failed to delete recording from storage:', err);
    });
    
    setRecordings(prev => {
      const recording = prev.find(r => r.id === id);
      if (recording) {
        URL.revokeObjectURL(recording.url);
      }
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const deleteScreenshot = useCallback((id: string) => {
    // Delete from IndexedDB
    deleteStoredScreenshot(id).catch(err => {
      console.error('Failed to delete screenshot from storage:', err);
    });
    
    setScreenshots(prev => {
      const screenshot = prev.find(s => s.id === id);
      if (screenshot) {
        URL.revokeObjectURL(screenshot.url);
      }
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const addRecording = useCallback((recording: Recording) => {
    // Add canvas overlays to the recording if any
    const recordingWithOverlays = {
      ...recording,
      canvasOverlays: canvasOverlays.length > 0 ? [...canvasOverlays] : undefined,
    };
    
    // Save to IndexedDB
    saveRecording(recordingWithOverlays).catch(err => {
      console.error('Failed to save recording:', err);
    });
    
    setRecordings(prev => [recordingWithOverlays, ...prev]);
    
    // Clear canvas overlays after saving
    setCanvasOverlays([]);
  }, [canvasOverlays]);

  // Add canvas overlay from FloatingCanvas
  const addCanvasOverlay = useCallback((imageData: string, width: number, height: number) => {
    const overlay: CanvasOverlay = {
      id: Date.now().toString(),
      imageData,
      timestamp: new Date(),
      width,
      height,
    };
    setCanvasOverlays(prev => [...prev, overlay]);
    
    toast({
      title: "Canvas Saved",
      description: "Drawing will be added to video during export",
    });
  }, []);

  // Clear all canvas overlays
  const clearCanvasOverlays = useCallback(() => {
    setCanvasOverlays([]);
  }, []);

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        isPaused,
        duration,
        settings,
        recordings,
        screenshots,
        canvasOverlays,
        cameraStream,
        isPipActive,
        isUIHidden,
        screenStream,
        updateSettings,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        deleteRecording,
        deleteScreenshot,
        setCameraStream,
        takeScreenshot,
        enablePip,
        disablePip,
        toggleMic,
        addRecording,
        addCanvasOverlay,
        clearCanvasOverlays,
        videoRef,
        canvasRef,
      }}
    >
      {children}
      {/* Hidden video element for PiP */}
      <video
        ref={videoRef}
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 320,
          height: 180,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
        playsInline
        muted
      />
      {/* Canvas for stream compositing */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          left: -9999,
          top: -9999,
          pointerEvents: 'none',
        }}
      />
    </RecordingContext.Provider>
  );
};

// Helper function
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
