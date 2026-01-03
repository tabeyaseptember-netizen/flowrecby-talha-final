import { motion } from 'framer-motion';
import { 
  Video, 
  Volume2, 
  MousePointer2, 
  Palette, 
  Shield, 
  HardDrive,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRecording } from '@/contexts/RecordingContext';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useRecording();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const themeOptions = [
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-8 max-w-3xl mx-auto"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your recording experience</p>
      </motion.div>

      <div className="space-y-6">
        {/* Video Settings */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Video Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Default Resolution</p>
                <p className="text-sm text-muted-foreground">Recording quality preset</p>
              </div>
              <select
                value={settings.quality}
                onChange={(e) => updateSettings({ quality: e.target.value as any })}
                className="px-4 py-2 rounded-lg bg-secondary border border-border text-foreground"
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p FHD</option>
                <option value="2k">2K QHD</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Frame Rate</p>
                <p className="text-sm text-muted-foreground">Recording FPS</p>
              </div>
              <div className="flex gap-2">
                {[30, 60].map((fps) => (
                  <button
                    key={fps}
                    onClick={() => updateSettings({ fps: fps as 30 | 60 })}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium transition-all",
                      settings.fps === fps
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    )}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Audio Settings */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Audio Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Default Audio Source</p>
                <p className="text-sm text-muted-foreground">Pre-selected audio option</p>
              </div>
              <select
                value={settings.audioSource}
                onChange={(e) => updateSettings({ audioSource: e.target.value as any })}
                className="px-4 py-2 rounded-lg bg-secondary border border-border text-foreground"
              >
                <option value="mic">Microphone Only</option>
                <option value="system">System Audio Only</option>
                <option value="both">Mic + System</option>
                <option value="none">No Audio</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Cursor & UI Settings */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MousePointer2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Cursor & UI</h2>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'showCursor', label: 'Show Cursor', description: 'Display mouse cursor in recordings' },
              { key: 'clickAnimation', label: 'Click Animation', description: 'Highlight mouse clicks with ripple effect' },
              { key: 'cursorSpotlight', label: 'Cursor Spotlight', description: 'Add spotlight glow around cursor' },
              { key: 'keystrokeDisplay', label: 'Keystroke Display', description: 'Show keyboard shortcuts on screen' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <button
                  onClick={() => updateSettings({ [item.key]: !settings[item.key as keyof typeof settings] })}
                  className={cn(
                    "w-12 h-7 rounded-full transition-colors relative",
                    settings[item.key as keyof typeof settings] ? "bg-primary" : "bg-muted"
                  )}
                >
                  <motion.div
                    animate={{ x: settings[item.key as keyof typeof settings] ? 22 : 2 }}
                    className="w-5 h-5 rounded-full bg-white shadow-md absolute top-1"
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          </div>
          
          <div className="flex gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  theme === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <option.icon className={cn(
                  "w-6 h-6",
                  theme === option.id ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  theme === option.id ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Storage */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Storage</h2>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Recordings are stored in your browser. Download recordings to save them permanently.
          </p>
          
          <div className="p-4 rounded-xl bg-secondary/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Browser Storage</span>
              <span className="text-sm font-medium text-foreground">Available</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/4 rounded-full bg-primary" />
            </div>
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
          </div>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              All recordings stay on your device
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              No data is uploaded to any server
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Clear permissions shown before recording
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Settings;
