import { useState, useEffect } from 'react';
import { useTheme } from '../theme';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
  text?: string;
}

export function Spinner({ text = 'Loading...' }: SpinnerProps) {
  const theme = useTheme();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <text>
      <span fg={theme.accent}>{SPINNER_FRAMES[frame]}</span>
      <span fg={theme.textSecondary}> {text}</span>
    </text>
  );
}
