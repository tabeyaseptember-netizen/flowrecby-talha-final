import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Point {
  x: number;
  y: number;
}

interface DrawPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface ScreenAnnotationOverlayProps {
  isDrawingMode: boolean;
  isZoomMode: boolean;
  zoomLevel: number;
  zoomPosition: Point | null;
  drawingColor: string;
  brushSize: number;
  onDrawingComplete?: (paths: DrawPath[]) => void;
}

export const ScreenAnnotationOverlay = ({
  isDrawingMode,
  isZoomMode,
  zoomLevel,
  zoomPosition,
  drawingColor,
  brushSize,
}: ScreenAnnotationOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  // Handle drawing
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    setIsDrawing(true);
    
    const point = getPoint(e);
    setCurrentPath([point]);
  }, [isDrawingMode]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode || !isDrawing) return;
    
    const point = getPoint(e);
    setCurrentPath(prev => [...prev, point]);
  }, [isDrawingMode, isDrawing]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingMode || !isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length > 0) {
      setPaths(prev => [...prev, {
        id: Date.now().toString(),
        points: currentPath,
        color: drawingColor,
        width: brushSize,
      }]);
      setCurrentPath([]);
    }
  }, [isDrawingMode, isDrawing, currentPath, drawingColor, brushSize]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  // Render paths to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed paths
    paths.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    // Draw current path
    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [paths, currentPath, drawingColor, brushSize]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear all drawings with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingMode) {
        setPaths([]);
        setCurrentPath([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode]);

  return (
    <>
      {/* Drawing Canvas Overlay */}
      <AnimatePresence>
        {isDrawingMode && (
          <motion.canvas
            ref={canvasRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-auto"
            style={{ cursor: 'crosshair' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        )}
      </AnimatePresence>

      {/* Zoom/Spotlight Overlay */}
      <AnimatePresence>
        {isZoomMode && zoomPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9997] pointer-events-none"
          >
            {/* Dark overlay with cutout */}
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle 150px at ${zoomPosition.x}px ${zoomPosition.y}px, transparent 0%, rgba(0,0,0,0.7) 100%)`,
              }}
            />
            
            {/* Zoom lens effect */}
            <motion.div
              className="absolute rounded-full border-4 border-primary shadow-2xl overflow-hidden"
              style={{
                width: 300,
                height: 300,
                left: zoomPosition.x - 150,
                top: zoomPosition.y - 150,
                transform: `scale(${zoomLevel})`,
                boxShadow: '0 0 60px rgba(var(--primary), 0.5)',
              }}
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawing Mode Indicator */}
      <AnimatePresence>
        {isDrawingMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full glass border border-primary shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: drawingColor }}
              />
              <span className="text-sm font-medium text-foreground">
                Drawing Mode - Press ESC to clear
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Mode Indicator */}
      <AnimatePresence>
        {isZoomMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full glass border border-primary shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                Spotlight Mode - {Math.round(zoomLevel * 100)}% - Click to highlight
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ScreenAnnotationOverlay;
