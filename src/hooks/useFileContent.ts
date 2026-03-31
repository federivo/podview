import { useState, useEffect, useCallback } from 'react';
import { readFile } from '../services/fileOperations';
import type { PodInfo } from '../types';

interface UseFileContentResult {
  lines: string[];
  loading: boolean;
  error: string | null;
  load: (path: string) => void;
  clear: () => void;
}

export function useFileContent(
  pod: PodInfo | null,
  container: string | null
): UseFileContentResult {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  useEffect(() => {
    if (!pod || !container || !filePath) {
      return;
    }

    let cancelled = false;
    const podRef = pod;
    const containerRef = container;
    const filePathRef = filePath;

    async function fetchContent() {
      setLoading(true);
      setError(null);

      try {
        const result = await readFile(
          podRef.namespace,
          podRef.name,
          containerRef,
          filePathRef
        );

        if (cancelled) return;
        setLines(result.split('\n'));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to read file');
        setLines([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchContent();

    return () => {
      cancelled = true;
    };
  }, [pod, container, filePath]);

  const load = useCallback((path: string) => {
    setFilePath(path);
  }, []);

  const clear = useCallback(() => {
    setFilePath(null);
    setLines([]);
    setError(null);
  }, []);

  return {
    lines,
    loading,
    error,
    load,
    clear,
  };
}
