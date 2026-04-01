import { useState, useEffect, useRef, useCallback } from 'react';
import { spawn } from 'child_process';

const MAX_LINES = 50000;
const FLUSH_INTERVAL_MS = 100;
const DEFAULT_TAIL_LINES = 1000;

interface UseLogStreamResult {
  lines: string[];
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
}

export function useLogStream(
  namespace: string,
  podName: string,
  container: string,
  tailLines: number = DEFAULT_TAIL_LINES
): UseLogStreamResult {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const bufferRef = useRef<string[]>([]);
  const partialLineRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

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

    const proc = spawn('kubectl', [
      'logs', '-f',
      '--tail', String(tailLines),
      '-n', namespace,
      '-c', container,
      podName,
    ]);

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
      partialLineRef.current = '';
      bufferRef.current = [];
    };
  }, [namespace, podName, container, tailLines, flush]);

  return { lines, loading, error, isStreaming };
}
