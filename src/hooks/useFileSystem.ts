import { useState, useEffect, useCallback } from 'react';
import { listDirectory, directoryExists } from '../services/fileOperations';
import type { FileEntry, PodInfo } from '../types';

interface UseFileSystemResult {
  entries: FileEntry[];
  currentPath: string;
  loading: boolean;
  error: string | null;
  navigateTo: (path: string) => void;
  goUp: () => void;
  refresh: () => void;
}

export function useFileSystem(
  pod: PodInfo | null,
  container: string | null,
  initialPath: string = '/'
): UseFileSystemResult {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [resolvedInitialPath, setResolvedInitialPath] = useState(false);

  // On first mount, check if /var/www/html exists and navigate there
  useEffect(() => {
    if (!pod || !container || resolvedInitialPath) return;

    let cancelled = false;

    async function resolveDefaultPath() {
      try {
        const exists = await directoryExists(
          pod!.namespace,
          pod!.name,
          container!,
          '/var/www/html'
        );
        if (!cancelled && exists) {
          setCurrentPath('/var/www/html');
        }
      } finally {
        if (!cancelled) {
          setResolvedInitialPath(true);
        }
      }
    }

    resolveDefaultPath();

    return () => {
      cancelled = true;
    };
  }, [pod, container, resolvedInitialPath]);

  useEffect(() => {
    if (!pod || !container || !resolvedInitialPath) {
      if (!resolvedInitialPath) return;
      setEntries([]);
      return;
    }

    let cancelled = false;
    const podRef = pod;
    const containerRef = container;

    async function fetchEntries() {
      setLoading(true);
      setError(null);

      try {
        const result = await listDirectory(
          podRef.namespace,
          podRef.name,
          containerRef,
          currentPath
        );

        if (cancelled) return;
        setEntries(result);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to list directory'
        );
        setEntries([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEntries();

    return () => {
      cancelled = true;
    };
  }, [pod, container, currentPath, refreshTrigger, resolvedInitialPath]);

  const navigateTo = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    setEntries([]);
    setLoading(true);
    setCurrentPath(normalized);
  }, []);

  const goUp = useCallback(() => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setEntries([]);
    setLoading(true);
    setCurrentPath(parts.length === 0 ? '/' : `/${parts.join('/')}`);
  }, [currentPath]);

  const refresh = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  return {
    entries,
    currentPath,
    loading,
    error,
    navigateTo,
    goUp,
    refresh,
  };
}
