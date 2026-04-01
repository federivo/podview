import { useState, useEffect, useRef, useMemo } from 'react';
import * as k8s from '@kubernetes/client-node';
import { PassThrough } from 'stream';
import { getKubeConfig } from '../services/kubernetes';
import type { PodInfo } from '../types';

const ACTIVE_THRESHOLD_MS = 5000;
const POLL_INTERVAL_MS = 3000;

function fetchLastLine(
  log: k8s.Log,
  namespace: string,
  podName: string,
  container: string,
): Promise<string> {
  return new Promise((resolve) => {
    const stream = new PassThrough();
    stream.on('error', () => resolve(''));

    let data = '';
    stream.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });

    stream.on('end', () => {
      resolve(data.trim());
    });

    // Timeout in case stream never ends
    const timeout = setTimeout(() => {
      stream.destroy();
      resolve(data.trim());
    }, 5000);

    stream.on('close', () => clearTimeout(timeout));

    log
      .log(namespace, podName, container, stream, { tailLines: 1 })
      .catch(() => resolve(''));
  });
}

export function usePodActivity(pods: PodInfo[]): Map<string, boolean> {
  const [activityMap, setActivityMap] = useState<Map<string, boolean>>(new Map());
  const lastLineRef = useRef<Map<string, string>>(new Map());
  const activityTsRef = useRef<Map<string, number>>(new Map());

  const podKey = useMemo(
    () => pods.map((p) => `${p.name}:${p.status}`).sort().join(','),
    [pods]
  );

  useEffect(() => {
    let cancelled = false;
    const lastLines = lastLineRef.current;
    const activityTs = activityTsRef.current;
    const kc = getKubeConfig();
    const log = new k8s.Log(kc);

    async function poll() {
      if (cancelled) return;

      const now = Date.now();

      const checks = pods
        .filter((p) => p.status === 'Running' && p.containers.length > 0)
        .map(async (pod) => {
          const lastLine = await fetchLastLine(
            log, pod.namespace, pod.name, pod.containers[0]!
          );
          if (lastLine) {
            const prev = lastLines.get(pod.name);
            if (prev !== lastLine) {
              lastLines.set(pod.name, lastLine);
              activityTs.set(pod.name, now);
            }
          }
        });

      await Promise.allSettled(checks);

      if (!cancelled) {
        const next = new Map<string, boolean>();
        for (const pod of pods) {
          const ts = activityTs.get(pod.name) ?? 0;
          next.set(pod.name, now - ts < ACTIVE_THRESHOLD_MS);
        }
        setActivityMap(next);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [podKey]);

  return activityMap;
}
