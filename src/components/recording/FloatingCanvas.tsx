import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Type, Trash2, Download, GripVertical, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

type ToolMode = 'draw' | 'text';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];
const BRUSH_SIZES = [2, 4, 8, 12];

export const FloatingCanvas = ({ isOpen, onClose }: FloatingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tool, setTool] = useState<ToolMode>('draw');
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  
  // Text input state
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [fontSize, setFontSize] = useState(20);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Fill with transparent background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen, canvasSize]);

  // Drawing functions
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setIsDrawing(true);
  }, [tool, color, brushSize]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'draw') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, tool]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Handle text placement
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'text') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setTextPosition({ x, y });
  }, [tool]);

  // Add text to canvas
  const addText = useCallback(() => {
    if (!textPosition || !textInput.trim()) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    setTextInput('');
    setTextPosition(null);
  }, [textPosition, textInput, color, fontSize]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTextPosition(null);
    setTextInput('');
  }, []);

  // Download canvas
  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // Handle key press for text
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && textPosition) {
        addText();
      } else if (e.key === 'Escape') {
        if (textPosition) {
          setTextPosition(null);
          setTextInput('');
        } else {
          onClose();
        }
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, textPosition, addText, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => {
            setPosition(prev => ({
              x: prev.x + info.offset.x,
              y: prev.y + info.offset.y,
            }));
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{ left: position.x, top: position.y }}
          className="fixed z-[9999] rounded-xl shadow-2xl border border-border overflow-hidden bg-card"
        >
          {/* Header - Drag Handle */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/80 border-b border-border cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Quick Canvas</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border flex-wrap">
            {/* Tool Selection */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
              <button
                onClick={() => setTool('draw')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  tool === 'draw' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
                title="Draw"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('text')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  tool === 'text' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
                title="Text"
              >
                <Type className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* Color Picker */}
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-primary scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #ccc' : undefined }}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* Brush Size (for drawing) / Font Size (for text) */}
            {tool === 'draw' ? (
              <div className="flex items-center gap-1">
                {BRUSH_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                      brushSize === size ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-muted"
                    )}
                    title={`${size}px`}
                  >
                    <div 
                      className="rounded-full bg-current" 
                      style={{ width: Math.min(size + 2, 12), height: Math.min(size + 2, 12) }} 
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFontSize(prev => Math.max(12, prev - 4))}
                  className="p-1.5 rounded-md bg-secondary hover:bg-muted transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-mono w-8 text-center">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(prev => Math.min(48, prev + 4))}
                  className="p-1.5 rounded-md bg-secondary hover:bg-muted transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* Actions */}
            <button
              onClick={clearCanvas}
              className="p-1.5 rounded-md bg-secondary hover:bg-destructive/20 hover:text-destructive transition-colors"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={downloadCanvas}
              className="p-1.5 rounded-md bg-secondary hover:bg-primary/20 hover:text-primary transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onClick={handleCanvasClick}
              className={cn(
                "block",
                tool === 'draw' ? "cursor-crosshair" : "cursor-text"
              )}
            />

            {/* Text Input Overlay */}
            {textPosition && (
              <div
                className="absolute"
                style={{ left: textPosition.x, top: textPosition.y - fontSize / 2 }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  autoFocus
                  placeholder="Type here..."
                  className="bg-transparent border-b-2 border-primary outline-none text-foreground px-1"
                  style={{ 
                    fontSize: `${fontSize}px`,
                    color: color,
                    minWidth: '100px',
                  }}
                  onBlur={addText}
                />
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground text-center border-t border-border">
            {tool === 'draw' ? 'Click and drag to draw' : 'Click on canvas to add text • Enter to confirm'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCanvas;
