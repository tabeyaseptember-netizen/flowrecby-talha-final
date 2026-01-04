import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Search, Grid, List, X, Image, Download, Trash2, Upload, Clock, Gauge } from 'lucide-react';
import { useRecording } from '@/contexts/RecordingContext';
import { RecordingCard } from '@/components/recording/RecordingCard';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatDuration = (seconds: number) => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Library = () => {
  const navigate = useNavigate();
  const { recordings, screenshots, deleteRecording, deleteScreenshot } = useRecording();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recordings');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const filteredRecordings = recordings.filter((recording) => {
    if (!searchQuery) return true;
    return recording.timestamp.toLocaleDateString().includes(searchQuery) ||
           recording.resolution.includes(searchQuery);
  });

  const filteredScreenshots = screenshots.filter((screenshot) => {
    if (!searchQuery) return true;
    return screenshot.timestamp.toLocaleDateString().includes(searchQuery);
  });

  const handleDownload = (recording: { url: string; id: string }) => {
    const a = document.createElement('a');
    a.href = recording.url;
    a.download = `flowrec-${recording.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadScreenshot = (screenshot: { url: string; id: string }) => {
    const a = document.createElement('a');
    a.href = screenshot.url;
    a.download = `flowrec-screenshot-${screenshot.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Update video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, playingVideo]);

  // Reset state when closing video
  const handleCloseVideo = () => {
    setPlayingVideo(null);
    setPlaybackSpeed(1);
    setCurrentTime(0);
    setDuration(0);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} • {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Open Editor Button */}
          <Button onClick={() => navigate('/editor')} className="gap-2">
            <Upload className="w-4 h-4" />
            Edit Video
          </Button>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* View Toggle */}
          <div className="flex p-1 rounded-lg bg-secondary">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'grid' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'list' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="recordings" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Recordings ({recordings.length})
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="gap-2">
            <Image className="w-4 h-4" />
            Screenshots ({screenshots.length})
          </TabsTrigger>
        </TabsList>

        {/* Recordings Tab */}
        <TabsContent value="recordings">
          {filteredRecordings.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}
            >
              <AnimatePresence>
                {filteredRecordings.map((recording) => (
                  <RecordingCard
                    key={recording.id}
                    recording={recording}
                    onPlay={() => setPlayingVideo(recording.url)}
                    onDownload={() => handleDownload(recording)}
                    onDelete={() => deleteRecording(recording.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <EmptyState 
              icon={<FolderOpen className="w-10 h-10 text-muted-foreground" />}
              title={searchQuery ? 'No recordings found' : 'No recordings yet'}
              description={searchQuery ? 'Try adjusting your search query' : 'Start recording to see your videos here'}
            />
          )}
        </TabsContent>

        {/* Screenshots Tab */}
        <TabsContent value="screenshots">
          {filteredScreenshots.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"
              )}
            >
              <AnimatePresence>
                {filteredScreenshots.map((screenshot) => (
                  <motion.div
                    key={screenshot.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="card-elevated overflow-hidden group"
                  >
                    <div className="relative aspect-video bg-secondary">
                      <img
                        src={screenshot.url}
                        alt="Screenshot"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadScreenshot(screenshot)}
                          className="p-2 rounded-lg bg-primary text-primary-foreground"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteScreenshot(screenshot.id)}
                          className="p-2 rounded-lg bg-destructive text-destructive-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 text-xs text-muted-foreground">
                      {formatDate(screenshot.timestamp)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <EmptyState 
              icon={<Image className="w-10 h-10 text-muted-foreground" />}
              title={searchQuery ? 'No screenshots found' : 'No screenshots yet'}
              description={searchQuery ? 'Try adjusting your search query' : 'Take screenshots during recording (Ctrl+Shift+S)'}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Video Player Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-lg flex items-center justify-center p-8"
            onClick={handleCloseVideo}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseVideo}
                className="absolute -top-12 right-0 p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Video */}
              <video
                ref={videoRef}
                src={playingVideo}
                controls
                autoPlay
                className="w-full rounded-2xl shadow-2xl"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                onLoadedData={(e) => {
                  const d = e.currentTarget.duration;
                  if (isFinite(d) && d > 0) setDuration(d);
                }}
              />

              {/* Controls bar */}
              <div className="mt-4 flex items-center justify-between gap-4 bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border">
                {/* Duration display */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                  </div>
                  {playbackSpeed !== 1 && duration > 0 && (
                    <div className="text-xs text-muted-foreground pl-6">
                      At {playbackSpeed}x: {formatDuration(duration / playbackSpeed)}
                    </div>
                  )}
                </div>

                {/* Playback speed selector */}
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYBACK_SPEEDS.map((speed) => (
                        <SelectItem key={speed} value={speed.toString()}>
                          {speed}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-24"
  >
    <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
      {icon}
    </div>
    <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground text-center max-w-md">{description}</p>
  </motion.div>
);

export default Library;
