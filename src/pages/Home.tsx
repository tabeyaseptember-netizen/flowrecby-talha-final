import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Volume2, Camera, Play, Clock, ArrowRight } from 'lucide-react';
import { useRecording } from '@/contexts/RecordingContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const Home = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, recordings } = useRecording();

  const isMicOn = settings.audioSource === 'mic' || settings.audioSource === 'both';
  const isSystemOn = settings.audioSource === 'system' || settings.audioSource === 'both';

  const toggleMic = () => {
    if (isMicOn && isSystemOn) {
      updateSettings({ audioSource: 'system' });
    } else if (isMicOn) {
      updateSettings({ audioSource: 'none' });
    } else if (isSystemOn) {
      updateSettings({ audioSource: 'both' });
    } else {
      updateSettings({ audioSource: 'mic' });
    }
  };

  const toggleSystem = () => {
    if (isSystemOn && isMicOn) {
      updateSettings({ audioSource: 'mic' });
    } else if (isSystemOn) {
      updateSettings({ audioSource: 'none' });
    } else if (isMicOn) {
      updateSettings({ audioSource: 'both' });
    } else {
      updateSettings({ audioSource: 'system' });
    }
  };

  const recentRecordings = recordings.slice(0, 3);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-8 max-w-5xl mx-auto"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center mb-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden mb-6 shadow-glow"
        >
          <img src={logo} alt="FlowRec" className="w-full h-full object-cover" />
        </motion.div>
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Welcome to <span className="text-gradient">FlowRec</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Capture your screen with crystal-clear quality. Simple, powerful, and smooth.
        </p>
      </motion.div>

      {/* Start Recording Button */}
      <motion.div variants={itemVariants} className="flex justify-center mb-12">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/record')}
          className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-lg shadow-glow hover:shadow-xl transition-shadow"
        >
          <span className="flex items-center gap-3">
            <Play className="w-6 h-6" />
            Start Recording
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </motion.button>
      </motion.div>

      {/* Quick Toggles */}
      <motion.div variants={itemVariants} className="card-elevated-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Quick Settings
        </h2>
        <div className="flex gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMic}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all",
              isMicOn
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            )}
          >
            <Mic className="w-5 h-5" />
            <span className="font-medium">Microphone</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isMicOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {isMicOn ? 'ON' : 'OFF'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSystem}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all",
              isSystemOn
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            )}
          >
            <Volume2 className="w-5 h-5" />
            <span className="font-medium">System Audio</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isSystemOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {isSystemOn ? 'ON' : 'OFF'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateSettings({ cameraEnabled: !settings.cameraEnabled })}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all",
              settings.cameraEnabled
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            )}
          >
            <Camera className="w-5 h-5" />
            <span className="font-medium">Camera</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              settings.cameraEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {settings.cameraEnabled ? 'ON' : 'OFF'}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Recordings */}
      {recentRecordings.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recent Recordings
            </h2>
            <button
              onClick={() => navigate('/library')}
              className="text-sm text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {recentRecordings.map((recording) => (
              <motion.div
                key={recording.id}
                whileHover={{ y: -4 }}
                className="card-elevated overflow-hidden group cursor-pointer"
                onClick={() => navigate('/library')}
              >
                <div className="relative aspect-video bg-secondary">
                  <video
                    src={recording.url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Play className="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm">
                    <span className="text-xs font-mono text-foreground">
                      {formatDuration(recording.duration)}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(recording.timestamp)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {recentRecordings.length === 0 && (
        <motion.div 
          variants={itemVariants}
          className="text-center py-12 card-elevated"
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
            <img src={logo} alt="FlowRec" className="w-full h-full object-cover" />
          </div>
          <p className="text-muted-foreground">
            No recordings yet. Start your first recording!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Home;
