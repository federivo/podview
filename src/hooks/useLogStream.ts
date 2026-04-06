import { useState, useEffect, useRef, useCallback } from 'react';
import { spawn } from 'child_process';
import { getCurrentContext } from '../services/kubernetes';

const MAX_LINES = 50000;
const FLUSH_INTERVAL_MS = 100;
const DEFAULT_TAIL_LINES = 1000;

export interface LogStreamOptions {
  tailLines?: number;
  timestamps?: boolean;
  filePath?: string;
}

interface UseLogStreamResult {
  lines: string[];
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  clear: () => void;
}

export function useLogStream(
  namespace: string,
  podName: string,
  container: string,
  options: LogStreamOptions = {}
): UseLogStreamResult {
  const { tailLines = DEFAULT_TAIL_LINES, timestamps = false, filePath } = options;
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const bufferRef = useRef<string[]>([]);
  const partialLineRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const procRef = useRef<ReturnType<typeof spawn> | null>(null);

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const newLines = bufferRef.current;
    bufferRef.current = [];
    setLines((prev) => {
      const combined = prev.concat(newLines);
      if (combined.length > MAX_LINES) {
        return combined.slice(combined.length - MAX_LINES);
      }
      return combined;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    startedRef.current = false;
    setLines([]);
    setError(null);
    setLoading(true);
    setIsStreaming(false);
    setIsPaused(false);

    let args: string[];
    if (filePath) {
      args = [
        'exec',
        '--context', getCurrentContext(),
        '-n', namespace,
        '-c', container,
        podName, '--',
        'tail', '-n', String(tailLines), '-f', filePath,
      ];
    } else {
      args = [
        'logs', '-f',
        '--context', getCurrentContext(),
        '--tail', String(tailLines),
        '-n', namespace,
        '-c', container,
      ];
      if (timestamps) args.push('--timestamps');
      args.push(podName);
    }

    const proc = spawn('kubectl', args);
    procRef.current = proc;

    proc.stdout.on('data', (chunk: Buffer) => {
      if (cancelled) return;
      const text = partialLineRef.current + chunk.toString();
      const parts = text.split('\n');
      partialLineRef.current = parts.pop() ?? '';
      if (parts.length > 0) {
        bufferRef.current.push(...parts);
      }
      if (!startedRef.current) {
        startedRef.current = true;
        setIsStreaming(true);
        setLoading(false);
      }
    });

    let stderrBuf = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    proc.on('close', (code) => {
      if (cancelled) return;
      // Flush remaining partial line
      if (partialLineRef.current) {
        bufferRef.current.push(partialLineRef.current);
        partialLineRef.current = '';
      }
      flush();
      setIsStreaming(false);
      if (code !== 0 && stderrBuf.trim()) {
        setError(stderrBuf.trim());
      }
      setLoading(false);
    });

    proc.on('error', (err) => {
      if (cancelled) return;
      setError(err.message);
      setLoading(false);
    });

    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flush();
      proc.kill();
      procRef.current = null;
      partialLineRef.current = '';
      bufferRef.current = [];
    };
  }, [namespace, podName, container, tailLines, timestamps, filePath, flush]);

  const pause = useCallback(() => {
    if (procRef.current?.stdout) {
      procRef.current.stdout.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (procRef.current?.stdout) {
      procRef.current.stdout.resume();
      setIsPaused(false);
    }
  }, []);

  const clear = useCallback(() => {
    bufferRef.current = [];
    setLines([]);
  }, []);

  return { lines, loading, error, isStreaming, isPaused, pause, resume, clear };
}
