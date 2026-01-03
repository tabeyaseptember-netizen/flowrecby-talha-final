import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  count: number | null;
}

export const CountdownOverlay = ({ count }: CountdownOverlayProps) => {
  return (
    <AnimatePresence>
      {count !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md"
        >
          <motion.div
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            {/* Outer ring pulse */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-4 border-primary"
              style={{ width: 200, height: 200, left: -50, top: -50 }}
            />
            
            {/* Main countdown circle */}
            <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <span className="text-6xl font-bold text-primary-foreground">
                {count}
              </span>
            </div>
            
            {/* Text below */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mt-6 text-lg font-medium text-muted-foreground"
            >
              Recording starts in...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
