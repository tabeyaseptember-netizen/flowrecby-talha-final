import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Loader2, 
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Scissors,
  Type,
  Sliders,
  RotateCcw,
  Check,
  Gauge,
} from 'lucide-react';
import { useRecording, Recording, CanvasOverlay } from '@/contexts/RecordingContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VideoState {
  url: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

interface TrimState {
  startTime: number;
  endTime: number;
}

interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  grayscale: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  startTime: number;
  endTime: number;
}

const defaultFilter: FilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
};

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const EXPORT_SPEEDS = [
  { value: 1, label: '1x (Original)' },
  { value: 1.25, label: '1.25x (Faster)' },
  { value: 1.5, label: '1.5x (Faster)' },
  { value: 2, label: '2x (Fastest)' },
];

const QUALITY_PRESETS = [
  { value: '720p', label: '720p', width: 1280, height: 720, defaultBitrate: 2500000 },
  { value: '1080p', label: '1080p', width: 1920, height: 1080, defaultBitrate: 5000000 },
  { value: '2k', label: '2K', width: 2560, height: 1440, defaultBitrate: 8000000 },
  { value: 'original', label: 'Original', width: 0, height: 0, defaultBitrate: 5000000 },
];

const BITRATE_RANGE = { min: 1000000, max: 15000000 }; // 1-15 Mbps

const formatBitrate = (bps: number) => {
  const mbps = bps / 1000000;
  return `${mbps.toFixed(1)} Mbps`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const VideoEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { recordings, addRecording } = useRecording();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('trim');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const [videoState, setVideoState] = useState<VideoState>({
    url: '',
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isMuted: false,
    volume: 1,
  });
  
  const [trimState, setTrimState] = useState<TrimState>({
    startTime: 0,
    endTime: 0,
  });
  
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [canvasOverlaysForExport, setCanvasOverlaysForExport] = useState<CanvasOverlay[]>([]);
  const [loadedOverlayImages, setLoadedOverlayImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [newText, setNewText] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [exportSpeed, setExportSpeed] = useState(1);
  const [exportQuality, setExportQuality] = useState('original');
  const [exportBitrate, setExportBitrate] = useState(5000000);
  
  const recordingId = searchParams.get('id');
  
  // Load video from recording or wait for file upload
  useEffect(() => {
    if (recordingId) {
      const recording = recordings.find(r => r.id === recordingId);
      if (recording) {
        loadVideoFromUrl(recording.url);
        
        // Load canvas overlays if present
        if (recording.canvasOverlays && recording.canvasOverlays.length > 0) {
          setCanvasOverlaysForExport(recording.canvasOverlays);
          
          // Preload overlay images
          const imageMap = new Map<string, HTMLImageElement>();
          recording.canvasOverlays.forEach(overlay => {
            const img = new Image();
            img.onload = () => {
              imageMap.set(overlay.id, img);
              setLoadedOverlayImages(new Map(imageMap));
            };
            img.src = overlay.imageData;
          });
        }
      } else {
        setLoadError('Recording not found');
        setIsLoading(false);
      }
    } else {
      // No recording ID - ready for file upload
      setIsLoading(false);
    }
  }, [recordingId, recordings]);
  
  const loadVideoFromUrl = useCallback((url: string) => {
    setIsLoading(true);
    setLoadError(null);
    
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';
    
    // Use loadeddata event for more reliable duration detection
    const handleVideoReady = () => {
      // Wait for valid duration
      if (isFinite(video.duration) && video.duration > 0) {
        setVideoState(prev => ({
          ...prev,
          url,
          duration: video.duration,
          currentTime: 0,
        }));
        setTrimState({
          startTime: 0,
          endTime: video.duration,
        });
        setIsLoading(false);
      } else {
        // Duration not ready yet, try waiting
        setTimeout(() => {
          if (isFinite(video.duration) && video.duration > 0) {
            setVideoState(prev => ({
              ...prev,
              url,
              duration: video.duration,
              currentTime: 0,
            }));
            setTrimState({
              startTime: 0,
              endTime: video.duration,
            });
          } else {
            // Fallback: use a default duration, will be updated when video plays
            setVideoState(prev => ({
              ...prev,
              url,
              duration: 0,
              currentTime: 0,
            }));
            setTrimState({
              startTime: 0,
              endTime: 0,
            });
          }
          setIsLoading(false);
        }, 500);
      }
    };
    
    video.onloadeddata = handleVideoReady;
    video.onloadedmetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        handleVideoReady();
      }
    };
    
    video.onerror = () => {
      setLoadError('Failed to load video');
      setIsLoading(false);
    };
  }, []);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a video file',
        variant: 'destructive',
      });
      return;
    }
    
    const url = URL.createObjectURL(file);
    loadVideoFromUrl(url);
  };
  
  // Video playback controls
  const play = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.play();
    setVideoState(prev => ({ ...prev, isPlaying: true }));
  }, []);
  
  const pause = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setVideoState(prev => ({ ...prev, isPlaying: false }));
  }, []);
  
  const togglePlay = () => {
    if (videoState.isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    const clampedTime = Math.max(trimState.startTime, Math.min(time, trimState.endTime));
    videoRef.current.currentTime = clampedTime;
    setVideoState(prev => ({ ...prev, currentTime: clampedTime }));
  }, [trimState]);
  
  const skipBack = () => seek(videoState.currentTime - 5);
  const skipForward = () => seek(videoState.currentTime + 5);
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoState.isMuted;
    setVideoState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };
  
  const setVolume = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value;
    setVideoState(prev => ({ ...prev, volume: value }));
  };

  // Handle playback speed change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);
  
  // Handle video time update and duration detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setVideoState(prev => ({ ...prev, currentTime: time }));
      
      // Stop at trim end point (only if endTime is valid)
      if (trimState.endTime > 0 && time >= trimState.endTime) {
        video.pause();
        video.currentTime = trimState.startTime;
        setVideoState(prev => ({ ...prev, isPlaying: false, currentTime: trimState.startTime }));
      }
    };
    
    const handleEnded = () => {
      setVideoState(prev => ({ ...prev, isPlaying: false }));
    };
    
    // Update duration when video loads (handles streaming/blob videos)
    const handleDurationChange = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        setVideoState(prev => {
          if (prev.duration === 0) {
            return { ...prev, duration: video.duration };
          }
          return prev;
        });
        setTrimState(prev => {
          if (prev.endTime === 0) {
            return { ...prev, endTime: video.duration };
          }
          return prev;
        });
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleDurationChange);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [trimState]);
  
  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Filter CSS
  const filterStyle = {
    filter: `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) hue-rotate(${filter.hue}deg) blur(${filter.blur}px) grayscale(${filter.grayscale}%)`,
  };
  
  // Add text overlay
  const addTextOverlay = () => {
    if (!newText.trim()) return;
    
    const overlay: TextOverlay = {
      id: Date.now().toString(),
      text: newText,
      x: 50,
      y: 50,
      fontSize: 32,
      color: '#ffffff',
      startTime: videoState.currentTime,
      endTime: Math.min(videoState.currentTime + 5, videoState.duration),
    };
    
    setTextOverlays(prev => [...prev, overlay]);
    setNewText('');
    
    toast({
      title: 'Text added',
      description: 'Text overlay added to video',
    });
  };
  
  const removeTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
  };
  
  // Visible text overlays
  const visibleOverlays = textOverlays.filter(
    t => videoState.currentTime >= t.startTime && videoState.currentTime <= t.endTime
  );
  
  // Reset filters
  const resetFilters = () => {
    setFilter(defaultFilter);
    toast({ title: 'Filters reset' });
  };
  
  // Get effective duration (use trimState if valid, fallback to videoState.duration)
  const getEffectiveDuration = useCallback(() => {
    const trimDuration = trimState.endTime - trimState.startTime;
    if (trimDuration > 0) {
      return trimDuration;
    }
    return videoState.duration || 0;
  }, [trimState, videoState.duration]);

  // Get selected quality preset
  const getSelectedQualityPreset = useCallback(() => {
    return QUALITY_PRESETS.find(q => q.value === exportQuality) || QUALITY_PRESETS[3];
  }, [exportQuality]);

  // Estimate file size based on bitrate, duration, and speed
  const estimateFileSize = useCallback(() => {
    const duration = getEffectiveDuration();
    if (duration <= 0) return 0;
    
    const exportedDuration = duration / exportSpeed;
    // Video bitrate + audio bitrate (128kbps)
    const totalBitsPerSecond = exportBitrate + 128000;
    const estimatedBits = totalBitsPerSecond * exportedDuration;
    return Math.round(estimatedBits / 8);
  }, [getEffectiveDuration, exportSpeed, exportBitrate]);

  // Handle quality preset change
  const handleQualityChange = useCallback((quality: string) => {
    setExportQuality(quality);
    const preset = QUALITY_PRESETS.find(q => q.value === quality);
    if (preset) {
      setExportBitrate(preset.defaultBitrate);
    }
  }, []);
  
  // Export video with audio using real-time playback
  const exportVideo = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: 'Export failed',
        description: 'Video not ready',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const previousMuted = video.muted;
    const previousRate = video.playbackRate;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Ensure we have metadata (duration + dimensions) before exporting.
      const ensureVideoReady = async () => {
        const isReady = () =>
          isFinite(video.duration) &&
          video.duration > 0 &&
          isFinite(video.videoWidth) &&
          video.videoWidth > 0 &&
          isFinite(video.videoHeight) &&
          video.videoHeight > 0;

        if (isReady()) return;

        await Promise.race([
          new Promise<void>((resolve, reject) => {
            const onReady = () => {
              if (!isReady()) return;
              cleanup();
              resolve();
            };
            const onError = () => {
              cleanup();
              reject(new Error('Failed to load video metadata'));
            };
            const cleanup = () => {
              video.removeEventListener('loadedmetadata', onReady);
              video.removeEventListener('durationchange', onReady);
              video.removeEventListener('canplay', onReady);
              video.removeEventListener('error', onError);
            };

            video.addEventListener('loadedmetadata', onReady);
            video.addEventListener('durationchange', onReady);
            video.addEventListener('canplay', onReady);
            video.addEventListener('error', onError);

            // If metadata already arrived between checks.
            onReady();
          }),
          new Promise<void>((_, reject) => {
            window.setTimeout(() => reject(new Error('Timed out waiting for video metadata')), 8000);
          }),
        ]);
      };

      await ensureVideoReady();

      // Set canvas dimensions based on quality preset
      const qualityPreset = getSelectedQualityPreset();
      if (qualityPreset.value === 'original' || qualityPreset.width === 0) {
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
      } else {
        // Scale maintaining aspect ratio
        const videoAspect = video.videoWidth / video.videoHeight;
        const presetAspect = qualityPreset.width / qualityPreset.height;
        
        if (videoAspect > presetAspect) {
          canvas.width = qualityPreset.width;
          canvas.height = Math.round(qualityPreset.width / videoAspect);
        } else {
          canvas.height = qualityPreset.height;
          canvas.width = Math.round(qualityPreset.height * videoAspect);
        }
      }

      const startTime = Math.max(0, Math.min(trimState.startTime || 0, video.duration));
      const endTime =
        trimState.endTime && trimState.endTime > startTime
          ? Math.min(trimState.endTime, video.duration)
          : video.duration;

      const totalDuration = endTime - startTime;
      if (!isFinite(totalDuration) || totalDuration <= 0) {
        throw new Error('Invalid trim range. Please wait for the video to load, then try again.');
      }

      const exportedDuration = totalDuration / exportSpeed;
      const frameRate = 30;

      // Capture canvas stream
      const canvasStream = canvas.captureStream(frameRate);
      if (canvasStream.getVideoTracks().length === 0) {
        throw new Error('Could not capture canvas stream');
      }

      // Create audio context and capture audio from video element
      let audioContext: AudioContext | null = null;
      let audioDestination: MediaStreamAudioDestinationNode | null = null;

      try {
        audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        audioDestination = audioContext.createMediaStreamDestination();
        source.connect(audioDestination);
        source.connect(audioContext.destination); // Play to speakers too

        const audioTrack = audioDestination.stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
      } catch (audioErr) {
        console.warn('Could not setup audio capture:', audioErr);
      }

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: exportBitrate,
        audioBitsPerSecond: 128000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      // Draw frame with filters and overlays
      const drawFrame = (currentTime: number) => {
        ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) hue-rotate(${filter.hue}deg) blur(${filter.blur}px) grayscale(${filter.grayscale}%)`;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        // Draw canvas overlays (drawings saved during recording)
        canvasOverlaysForExport.forEach((overlay) => {
          const img = loadedOverlayImages.get(overlay.id);
          if (img && img.complete) {
            const scale = Math.min(canvas.width / overlay.width, canvas.height / overlay.height);
            const scaledWidth = overlay.width * scale;
            const scaledHeight = overlay.height * scale;
            const offsetX = (canvas.width - scaledWidth) / 2;
            const offsetY = (canvas.height - scaledHeight) / 2;
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
          }
        });

        // Draw text overlays
        textOverlays.forEach((text) => {
          if (currentTime >= text.startTime && currentTime <= text.endTime) {
            ctx.save();
            ctx.font = `bold ${text.fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(text.text, (text.x / 100) * canvas.width, (text.y / 100) * canvas.height);
            ctx.restore();
          }
        });
      };

      // Seek reliably
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Seek failed'));
        };
        const cleanup = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
        };

        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        video.currentTime = startTime;

        // If browser doesn't dispatch seeked for same-time seeks.
        if (Math.abs(video.currentTime - startTime) < 0.01) {
          cleanup();
          resolve();
        }
      });

      video.muted = false;
      video.playbackRate = exportSpeed;

      // Ensure at least one frame is drawn before recording starts (prevents 0B exports in some browsers).
      drawFrame(startTime);

      const blob = await new Promise<Blob>((resolve, reject) => {
        let frameHandle: number | null = null;
        const rvfc = (video as any).requestVideoFrameCallback?.bind(video) as
          | undefined
          | ((cb: () => void) => number);
        const cancelRvfc = (video as any).cancelVideoFrameCallback?.bind(video) as
          | undefined
          | ((handle: number) => void);

        const stopRecording = () => {
          try {
            (mediaRecorder as any).requestData?.();
          } catch {
            // ignore
          }
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        mediaRecorder.onstop = () => {
          if (rvfc && cancelRvfc && frameHandle != null) cancelRvfc(frameHandle);
          if (!rvfc && frameHandle != null) cancelAnimationFrame(frameHandle);
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
        mediaRecorder.onerror = () => reject(new Error('MediaRecorder error'));

        const tick = () => {
          const t = video.currentTime;
          drawFrame(t);
          setExportProgress(Math.max(0, Math.min(100, ((t - startTime) / totalDuration) * 100)));

          if (t >= endTime || video.ended) {
            video.pause();
            stopRecording();
            return;
          }

          if (rvfc) {
            frameHandle = rvfc(tick);
          } else {
            frameHandle = requestAnimationFrame(() => {
              if (video.paused) {
                stopRecording();
                return;
              }
              tick();
            });
          }
        };

        mediaRecorder.start();

        video
          .play()
          .then(() => tick())
          .catch((err) => {
            stopRecording();
            reject(err);
          });
      });

      // Cleanup audio context
      if (audioContext) {
        audioContext.close();
      }

      if (!blob || blob.size === 0) {
        throw new Error('Export created an empty file (0B). Please try again.');
      }

      // Reset video state
      video.pause();
      video.muted = previousMuted;
      video.currentTime = startTime;
      video.playbackRate = previousRate;

      // Download (revoke URL after a delay to avoid 0B downloads in some browsers)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-video-${exportSpeed > 1 ? `${exportSpeed}x-` : ''}${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);

      // Add to library
      const newRecording: Recording = {
        id: 'edited-' + Date.now(),
        blob,
        url: URL.createObjectURL(blob),
        duration: exportedDuration,
        timestamp: new Date(),
        resolution: `${canvas.width}x${canvas.height}`,
        size: blob.size,
      };
      addRecording(newRecording);

      toast({
        title: 'Export complete',
        description: `Video saved at ${exportSpeed}x speed (${formatTime(exportedDuration)})`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An error occurred during export',
        variant: 'destructive',
      });
    } finally {
      // Always restore video state
      video.muted = previousMuted;
      video.playbackRate = previousRate;

      setIsExporting(false);
      setExportProgress(0);
    }
  };
  
  const formatTime = (seconds: number) => {
    // Handle invalid values
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading video...</p>
      </div>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-destructive">{loadError}</p>
        <Button onClick={() => navigate('/library')}>Back to Library</Button>
      </div>
    );
  }
  
  // No video loaded - show upload
  if (!videoState.url) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Video Editor</h1>
        </header>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50 transition-all flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Upload a video</p>
                <p className="text-sm text-muted-foreground">Click to select a video file</p>
              </div>
            </button>
          </motion.div>
        </div>
      </div>
    );
  }
  
  // Main editor UI
  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-screen bg-background overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Video Editor</h1>
        </div>
        
        <Button 
          onClick={exportVideo} 
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {Math.round(exportProgress)}%
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export
            </>
          )}
        </Button>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video preview area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={videoState.url}
              className="max-w-full max-h-full"
              style={filterStyle}
              playsInline
              muted={videoState.isMuted}
              onClick={togglePlay}
            />
            
            {/* Canvas overlay indicator */}
            {canvasOverlaysForExport.length > 0 && (
              <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-md bg-primary/80 text-primary-foreground text-xs">
                <span>📝 {canvasOverlaysForExport.length} drawing overlay{canvasOverlaysForExport.length > 1 ? 's' : ''}</span>
              </div>
            )}
            
            {/* Canvas overlays preview (scaled down) */}
            {canvasOverlaysForExport.map(overlay => {
              const img = loadedOverlayImages.get(overlay.id);
              if (!img) return null;
              return (
                <img
                  key={overlay.id}
                  src={overlay.imageData}
                  alt="Canvas overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
                />
              );
            })}
            
            {/* Text overlays */}
            {visibleOverlays.map(overlay => (
              <div
                key={overlay.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  style={{
                    fontSize: overlay.fontSize * 0.5,
                    color: overlay.color,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  {overlay.text}
                </span>
              </div>
            ))}
            
            {/* Play overlay */}
            {!videoState.isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20"
              >
                <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="w-10 h-10 text-primary-foreground ml-1" />
                </div>
              </button>
            )}
          </div>
          
          {/* Playback controls */}
          <div className="bg-card border-t border-border p-4 space-y-3 shrink-0">
            {/* Duration info bar */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/50">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatTime(getEffectiveDuration())}
                </span>
              </div>
              {playbackSpeed !== 1 && (
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-primary/10">
                  <span className="text-muted-foreground">At {playbackSpeed}x:</span>
                  <span className="font-mono font-medium text-primary">
                    {formatTime(getEffectiveDuration() / playbackSpeed)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-12">
                {formatTime(videoState.currentTime)}
              </span>
              <div className="flex-1 relative">
                <Slider
                  value={[videoState.currentTime]}
                  min={0}
                  max={videoState.duration || 1}
                  step={0.01}
                  onValueChange={(v) => seek(v[0])}
                />
                {/* Trim indicators */}
                {videoState.duration > 0 && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 h-4 bg-primary/20 pointer-events-none"
                    style={{
                      left: `${(trimState.startTime / videoState.duration) * 100}%`,
                      width: `${((trimState.endTime - trimState.startTime) / videoState.duration) * 100}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                {formatTime(videoState.duration)}
              </span>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {videoState.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                
                <Slider
                  value={[videoState.volume]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(v) => setVolume(v[0])}
                  className="w-20"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={skipBack}>
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                <Button size="icon" onClick={togglePlay} className="w-12 h-12 rounded-full">
                  {videoState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </Button>
                
                <Button variant="ghost" size="icon" onClick={skipForward}>
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Playback speed selector */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer"
                  >
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <option key={speed} value={speed}>
                        {speed}x
                      </option>
                    ))}
                  </select>
                </div>
                
                <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 m-3 shrink-0">
              <TabsTrigger value="trim" className="gap-1 text-xs px-2">
                <Scissors className="w-3.5 h-3.5" />
                Trim
              </TabsTrigger>
              <TabsTrigger value="speed" className="gap-1 text-xs px-2">
                <Download className="w-3.5 h-3.5" />
                Export
              </TabsTrigger>
              <TabsTrigger value="filters" className="gap-1 text-xs px-2">
                <Sliders className="w-3.5 h-3.5" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-1 text-xs px-2">
                <Type className="w-3.5 h-3.5" />
                Text
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto">
              {/* Trim Tab */}
              <TabsContent value="trim" className="p-4 space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Start Time: {formatTime(trimState.startTime)}</Label>
                  <Slider
                    value={[trimState.startTime]}
                    min={0}
                    max={videoState.duration}
                    step={0.1}
                    onValueChange={(v) => setTrimState(prev => ({ 
                      ...prev, 
                      startTime: Math.min(v[0], prev.endTime - 0.5) 
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>End Time: {formatTime(trimState.endTime)}</Label>
                  <Slider
                    value={[trimState.endTime]}
                    min={0}
                    max={videoState.duration}
                    step={0.1}
                    onValueChange={(v) => setTrimState(prev => ({ 
                      ...prev, 
                      endTime: Math.max(v[0], prev.startTime + 0.5) 
                    }))}
                  />
                </div>
                
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">
                    Duration: <span className="font-medium text-foreground">
                      {formatTime(trimState.endTime - trimState.startTime)}
                    </span>
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTrimState({ startTime: videoState.currentTime, endTime: trimState.endTime })}
                  >
                    Set Start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTrimState({ startTime: trimState.startTime, endTime: videoState.currentTime })}
                  >
                    Set End
                  </Button>
                </div>
              </TabsContent>

              {/* Speed Tab - Now Export Settings */}
              <TabsContent value="speed" className="p-4 space-y-5 mt-0">
                {/* Quality Presets */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Export Quality</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUALITY_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => handleQualityChange(preset.value)}
                        className={cn(
                          "p-3 rounded-lg border text-sm font-medium transition-all",
                          exportQuality === preset.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        )}
                      >
                        <div className="font-medium">{preset.label}</div>
                        {preset.width > 0 && (
                          <div className="text-xs opacity-70">{preset.width}×{preset.height}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bitrate Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">Bitrate</Label>
                    <span className="text-sm font-medium text-primary">{formatBitrate(exportBitrate)}</span>
                  </div>
                  <Slider
                    value={[exportBitrate]}
                    min={BITRATE_RANGE.min}
                    max={BITRATE_RANGE.max}
                    step={500000}
                    onValueChange={(v) => setExportBitrate(v[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Lower (smaller file)</span>
                    <span>Higher (better quality)</span>
                  </div>
                </div>

                {/* Export Speed */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Export Speed</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPORT_SPEEDS.map((speed) => (
                      <button
                        key={speed.value}
                        onClick={() => setExportSpeed(speed.value)}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs font-medium transition-all",
                          exportSpeed === speed.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        )}
                      >
                        {speed.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Summary */}
                <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">
                      {formatTime(getEffectiveDuration() / exportSpeed)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="font-medium text-foreground">
                      {getSelectedQualityPreset().label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bitrate</span>
                    <span className="font-medium text-foreground">
                      {formatBitrate(exportBitrate)}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Est. File Size</span>
                      <span className="font-semibold text-primary">
                        ~{formatFileSize(estimateFileSize())}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Filters Tab */}
              <TabsContent value="filters" className="p-4 space-y-4 mt-0">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Brightness</Label>
                      <span className="text-muted-foreground">{filter.brightness}%</span>
                    </div>
                    <Slider
                      value={[filter.brightness]}
                      min={0}
                      max={200}
                      onValueChange={(v) => setFilter(f => ({ ...f, brightness: v[0] }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Contrast</Label>
                      <span className="text-muted-foreground">{filter.contrast}%</span>
                    </div>
                    <Slider
                      value={[filter.contrast]}
                      min={0}
                      max={200}
                      onValueChange={(v) => setFilter(f => ({ ...f, contrast: v[0] }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Saturation</Label>
                      <span className="text-muted-foreground">{filter.saturation}%</span>
                    </div>
                    <Slider
                      value={[filter.saturation]}
                      min={0}
                      max={200}
                      onValueChange={(v) => setFilter(f => ({ ...f, saturation: v[0] }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Hue</Label>
                      <span className="text-muted-foreground">{filter.hue}°</span>
                    </div>
                    <Slider
                      value={[filter.hue]}
                      min={0}
                      max={360}
                      onValueChange={(v) => setFilter(f => ({ ...f, hue: v[0] }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Blur</Label>
                      <span className="text-muted-foreground">{filter.blur}px</span>
                    </div>
                    <Slider
                      value={[filter.blur]}
                      min={0}
                      max={10}
                      onValueChange={(v) => setFilter(f => ({ ...f, blur: v[0] }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Grayscale</Label>
                      <span className="text-muted-foreground">{filter.grayscale}%</span>
                    </div>
                    <Slider
                      value={[filter.grayscale]}
                      min={0}
                      max={100}
                      onValueChange={(v) => setFilter(f => ({ ...f, grayscale: v[0] }))}
                    />
                  </div>
                </div>
                
                <Button variant="outline" className="w-full gap-2" onClick={resetFilters}>
                  <RotateCcw className="w-4 h-4" />
                  Reset Filters
                </Button>
              </TabsContent>
              
              {/* Text Tab */}
              <TabsContent value="text" className="p-4 space-y-4 mt-0">
                <div className="flex gap-2">
                  <Input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter text..."
                    onKeyDown={(e) => e.key === 'Enter' && addTextOverlay()}
                  />
                  <Button onClick={addTextOverlay} size="icon">
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {textOverlays.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No text overlays. Add text above.
                    </p>
                  ) : (
                    textOverlays.map(overlay => (
                      <div
                        key={overlay.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                      >
                        <div>
                          <p className="text-sm font-medium truncate max-w-[180px]">{overlay.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTextOverlay(overlay.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      
      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Export modal */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Exporting Video</h2>
              <div className="w-full bg-secondary rounded-full h-2 mb-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round(exportProgress)}% complete
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoEditor;