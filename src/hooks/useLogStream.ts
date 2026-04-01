import { useState, useEffect, useRef, useCallback } from 'react';
import * as k8s from '@kubernetes/client-node';
import { PassThrough } from 'stream';
import { getKubeConfig } from '../services/kubernetes';

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
  const abortRef = useRef<AbortController | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const stream = new PassThrough();

    stream.on('data', (chunk: Buffer) => {
      const text = partialLineRef.current + chunk.toString();
      const parts = text.split('\n');
      // Last element is either empty (line ended with \n) or a partial line
      partialLineRef.current = parts.pop() ?? '';
      if (parts.length > 0) {
        bufferRef.current.push(...parts);
      }
      if (loading && !cancelled) {
        setLoading(false);
      }
    });

    stream.on('end', () => {
      // Flush any remaining partial line
      if (partialLineRef.current) {
        bufferRef.current.push(partialLineRef.current);
        partialLineRef.current = '';
      }
      flush();
      if (!cancelled) {
        setIsStreaming(false);
      }
    });

    stream.on('error', (err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Stream error');
        setIsStreaming(false);
      }
    });

    // Start flush interval
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);

    const kc = getKubeConfig();
    const log = new k8s.Log(kc);

    log
      .log(namespace, podName, container, stream, {
        follow: true,
        tailLines,
      })
      .then((abort) => {
        if (cancelled) {
          abort.abort();
          return;
        }
        abortRef.current = abort;
        setIsStreaming(true);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start log stream');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flush();
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      stream.destroy();
      partialLineRef.current = '';
      bufferRef.current = [];
    };
  }, [namespace, podName, container, tailLines, flush]);

  return { lines, loading, error, isStreaming };
}
