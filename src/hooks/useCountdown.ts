import { useState, useCallback } from 'react';

export const useCountdown = (onComplete: () => void, duration: number = 3) => {
  const [count, setCount] = useState<number | null>(null);

  const startCountdown = useCallback(() => {
    setCount(duration);
    
    let current = duration;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCount(current);
      } else {
        setCount(null);
        clearInterval(interval);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return { count, startCountdown };
};
