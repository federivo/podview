import { useState, useEffect } from 'react';
import { getCoreApi } from '../services/kubernetes';
import type { PodInfo } from '../types';

interface UsePodsResult {
  pods: PodInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePods(namespace: string): UsePodsResult {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchPods() {
      setLoading(true);
      setError(null);

      try {
        const api = getCoreApi();
        const response = await api.listNamespacedPod({ namespace });

        if (cancelled) return;

        const podList: PodInfo[] = (response.items || []).map((pod) => ({
          name: pod.metadata?.name || 'unknown',
          namespace: pod.metadata?.namespace || namespace,
          status: pod.status?.phase || 'Unknown',
          containers: (pod.spec?.containers || []).map((c) => c.name),
          createdAt: pod.metadata?.creationTimestamp
            ? new Date(pod.metadata.creationTimestamp)
            : new Date(),
        }));

        setPods(podList);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch pods');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPods();

    return () => {
      cancelled = true;
    };
  }, [namespace, refreshTrigger]);

  const refresh = () => setRefreshTrigger((n) => n + 1);

  return { pods, loading, error, refresh };
}
