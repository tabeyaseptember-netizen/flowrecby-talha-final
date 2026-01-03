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
} from 'lucide-react';
import { useRecording, Recording } from '@/contexts/RecordingContext';
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
  const [newText, setNewText] = useState('');
  
  const recordingId = searchParams.get('id');
  
  // Load video from recording or wait for file upload
  useEffect(() => {
    if (recordingId) {
      const recording = recordings.find(r => r.id === recordingId);
      if (recording) {
        loadVideoFromUrl(recording.url);
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
  
  // Export video with audio
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
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context not available');
      
      // Set canvas dimensions
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      
      const frameRate = 30;
      const canvasStream = canvas.captureStream(frameRate);
      
      // Create a new video element to play the trimmed section for audio capture
      const audioVideo = document.createElement('video');
      audioVideo.src = videoState.url;
      audioVideo.currentTime = trimState.startTime;
      audioVideo.muted = false;
      
      // Try to capture audio from the video
      let combinedStream: MediaStream;
      
      try {
        // Create audio context to capture video's audio
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audioVideo);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination); // Also play to speakers
        
        // Combine video canvas stream with audio
        const audioTrack = destination.stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
        combinedStream = canvasStream;
      } catch (err) {
        console.warn('Could not capture audio, exporting video only:', err);
        combinedStream = canvasStream;
      }
      
      // Setup MediaRecorder with audio codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus' 
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
      
      const mediaRecorder = new MediaRecorder(combinedStream, { 
        mimeType,
        videoBitsPerSecond: 5000000,
        audioBitsPerSecond: 128000,
      });
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const exportPromise = new Promise<Blob>((resolve, reject) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        mediaRecorder.onerror = (e) => reject(e);
      });
      
      // Start recording and playing
      mediaRecorder.start(100);
      
      // Render frames
      const startTime = trimState.startTime;
      const endTime = trimState.endTime;
      const totalDuration = endTime - startTime;
      const totalFrames = Math.ceil(totalDuration * frameRate);
      
      video.currentTime = startTime;
      video.muted = true;
      
      // Start playing audio video from trim start
      audioVideo.currentTime = startTime;
      try {
        await audioVideo.play();
      } catch (e) {
        console.warn('Could not play audio:', e);
      }
      
      for (let i = 0; i < totalFrames; i++) {
        await new Promise<void>((resolve) => {
          const currentTime = startTime + (i / frameRate);
          video.currentTime = currentTime;
          
          video.onseeked = () => {
            // Apply filter
            ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) hue-rotate(${filter.hue}deg) blur(${filter.blur}px) grayscale(${filter.grayscale}%)`;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
            
            // Draw text overlays
            textOverlays.forEach(text => {
              if (currentTime >= text.startTime && currentTime <= text.endTime) {
                ctx.save();
                ctx.font = `bold ${text.fontSize}px system-ui, sans-serif`;
                ctx.fillStyle = text.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Add text shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillText(text.text, (text.x / 100) * canvas.width, (text.y / 100) * canvas.height);
                ctx.restore();
              }
            });
            
            setExportProgress(((i + 1) / totalFrames) * 100);
            resolve();
          };
        });
      }
      
      // Stop audio video
      audioVideo.pause();
      
      mediaRecorder.stop();
      const blob = await exportPromise;
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-video-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Add to library
      const newRecording: Recording = {
        id: 'edited-' + Date.now(),
        blob,
        url: URL.createObjectURL(blob),
        duration: totalDuration,
        timestamp: new Date(),
        resolution: `${canvas.width}x${canvas.height}`,
        size: blob.size,
      };
      addRecording(newRecording);
      
      toast({
        title: 'Export complete',
        description: 'Video saved and added to library',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'An error occurred during export',
        variant: 'destructive',
      });
    } finally {
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
                <div 
                  className="absolute top-1/2 -translate-y-1/2 h-4 bg-primary/20 pointer-events-none"
                  style={{
                    left: `${(trimState.startTime / videoState.duration) * 100}%`,
                    width: `${((trimState.endTime - trimState.startTime) / videoState.duration) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                {formatTime(videoState.duration)}
              </span>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-center gap-2">
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
              
              <Button variant="ghost" size="icon" onClick={skipBack}>
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button size="icon" onClick={togglePlay} className="w-12 h-12 rounded-full">
                {videoState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
              
              <Button variant="ghost" size="icon" onClick={skipForward}>
                <SkipForward className="w-5 h-5" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 m-3 shrink-0">
              <TabsTrigger value="trim" className="gap-1">
                <Scissors className="w-4 h-4" />
                Trim
              </TabsTrigger>
              <TabsTrigger value="filters" className="gap-1">
                <Sliders className="w-4 h-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-1">
                <Type className="w-4 h-4" />
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