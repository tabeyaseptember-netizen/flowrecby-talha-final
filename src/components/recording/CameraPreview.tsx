import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  CameraOff, 
  Circle, 
  Square, 
  RectangleHorizontal,
  FlipHorizontal,
  Sparkles
} from 'lucide-react';
import { motion as m, AnimatePresence } from 'framer-motion';
import { useRecording, CameraShape, WebcamSize, WebcamCorner } from '@/contexts/RecordingContext';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const CameraPreview = () => {
  const { settings, updateSettings, setCameraStream, isRecording } = useRecording();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasCamera(devices.some(d => d.kind === 'videoinput'));
      } catch {
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  useEffect(() => {
    const setupCamera = async () => {
      if (settings.cameraEnabled && hasCamera) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' }
          });
          setStream(mediaStream);
          setCameraStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error('Camera access denied:', err);
          updateSettings({ cameraEnabled: false });
        }
      } else if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setCameraStream(null);
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [settings.cameraEnabled, hasCamera]);

  const toggleCamera = () => {
    updateSettings({ cameraEnabled: !settings.cameraEnabled });
  };

  const shapes: { id: CameraShape; icon: typeof Circle; label: string }[] = [
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'rounded', icon: RectangleHorizontal, label: 'Rounded' },
    { id: 'square', icon: Square, label: 'Square' },
  ];

  const sizes: { id: WebcamSize; label: string }[] = [
    { id: 'small', label: 'S' },
    { id: 'medium', label: 'M' },
    { id: 'large', label: 'L' },
  ];

  const corners: { id: WebcamCorner; label: string; position: string }[] = [
    { id: 'top-left', label: 'TL', position: 'top-1 left-1' },
    { id: 'top-right', label: 'TR', position: 'top-1 right-1' },
    { id: 'bottom-left', label: 'BL', position: 'bottom-1 left-1' },
    { id: 'bottom-right', label: 'BR', position: 'bottom-1 right-1' },
  ];

  const isLocked = isRecording;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Camera Overlay (Face-Cam)
        </h3>
        {isLocked && (
          <span className="text-xs text-recording bg-recording/20 px-2 py-1 rounded-full">
            Locked during recording
          </span>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Webcam will be composited into the final recording.
      </p>
      
      <div className="flex gap-4">
        {/* Toggle & Preview */}
        <motion.button
          whileHover={{ scale: isLocked ? 1 : 1.02 }}
          whileTap={{ scale: isLocked ? 1 : 0.98 }}
          onClick={toggleCamera}
          disabled={!hasCamera || isLocked}
          className={cn(
            "relative w-32 h-32 rounded-2xl border-2 overflow-hidden transition-all",
            settings.cameraEnabled
              ? "border-primary shadow-glow"
              : "border-border bg-card hover:border-primary/50",
            (!hasCamera || isLocked) && "opacity-50 cursor-not-allowed"
          )}
        >
          <AnimatePresence mode="wait">
            {settings.cameraEnabled && stream ? (
              <m.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute inset-0",
                  settings.cameraShape === 'circle' && "rounded-full overflow-hidden m-2"
                )}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "w-full h-full object-cover",
                    settings.webcamMirror && "scale-x-[-1]"
                  )}
                />
              </m.div>
            ) : (
              <m.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary"
              >
                {hasCamera ? (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <CameraOff className="w-8 h-8 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {hasCamera ? 'Click to enable' : 'No camera'}
                </span>
              </m.div>
            )}
          </AnimatePresence>

          {/* Position indicator overlay */}
          {settings.cameraEnabled && (
            <div className="absolute inset-0 pointer-events-none">
              {corners.map((corner) => (
                <div
                  key={corner.id}
                  className={cn(
                    "absolute w-3 h-3 rounded-full transition-all",
                    corner.position,
                    settings.webcamCorner === corner.id 
                      ? "bg-primary scale-100" 
                      : "bg-muted-foreground/30 scale-75"
                  )}
                />
              ))}
            </div>
          )}
        </motion.button>

        <div className="flex-1 flex flex-col gap-3">
          {/* Position Grid */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Position</span>
            <div className="grid grid-cols-4 gap-1">
              {corners.map((corner) => (
                <button
                  key={corner.id}
                  onClick={() => updateSettings({ webcamCorner: corner.id })}
                  disabled={!settings.cameraEnabled || isLocked}
                  className={cn(
                    "px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    settings.webcamCorner === corner.id && settings.cameraEnabled
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50",
                    (!settings.cameraEnabled || isLocked) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {corner.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shape & Size Row */}
          <div className="flex gap-4">
            {/* Shape Options */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Shape</span>
              <div className="flex gap-1">
                {shapes.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => updateSettings({ cameraShape: shape.id })}
                    disabled={!settings.cameraEnabled || isLocked}
                    className={cn(
                      "p-2 rounded-lg border transition-all",
                      settings.cameraShape === shape.id && settings.cameraEnabled
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50",
                      (!settings.cameraEnabled || isLocked) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <shape.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Size Options */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Size</span>
              <div className="flex gap-1">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => updateSettings({ webcamSize: size.id })}
                    disabled={!settings.cameraEnabled || isLocked}
                    className={cn(
                      "px-2.5 py-2 rounded-lg border text-xs font-medium transition-all",
                      settings.webcamSize === size.id && settings.cameraEnabled
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50",
                      (!settings.cameraEnabled || isLocked) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Switch
                id="webcam-border"
                checked={settings.webcamBorder}
                onCheckedChange={(checked) => updateSettings({ webcamBorder: checked })}
                disabled={!settings.cameraEnabled || isLocked}
              />
              <Label htmlFor="webcam-border" className="text-xs text-muted-foreground cursor-pointer">
                Border
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="webcam-shadow"
                checked={settings.webcamShadow}
                onCheckedChange={(checked) => updateSettings({ webcamShadow: checked })}
                disabled={!settings.cameraEnabled || isLocked}
              />
              <Label htmlFor="webcam-shadow" className="text-xs text-muted-foreground cursor-pointer">
                Shadow
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="webcam-mirror"
                checked={settings.webcamMirror}
                onCheckedChange={(checked) => updateSettings({ webcamMirror: checked })}
                disabled={!settings.cameraEnabled || isLocked}
              />
              <Label htmlFor="webcam-mirror" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                <FlipHorizontal className="w-3 h-3" /> Mirror
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
