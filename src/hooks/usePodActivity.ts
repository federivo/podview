import { useState, useEffect, useRef, useMemo } from 'react';
import * as k8s from '@kubernetes/client-node';
import { PassThrough } from 'stream';
import { getKubeConfig } from '../services/kubernetes';
import type { PodInfo } from '../types';

const ACTIVE_THRESHOLD_MS = 5000;
const POLL_INTERVAL_MS = 3000;
const MAX_CONCURRENT = 5;

interface AbortableResult {
  promise: Promise<string>;
  abort: () => void;
}

function fetchLastLine(
  log: k8s.Log,
  namespace: string,
  podName: string,
  container: string,
): AbortableResult {
  let aborted = false;
  const stream = new PassThrough();

  const timeout = setTimeout(() => {
    stream.destroy();
  }, 4000);

  const promise = new Promise<string>((resolve) => {
    if (aborted) { resolve(''); return; }

    stream.on('error', () => { clearTimeout(timeout); resolve(''); });

    let data = '';
    stream.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });

    stream.on('end', () => {
      clearTimeout(timeout);
      resolve(data.trim());
    });

    stream.on('close', () => {
      clearTimeout(timeout);
      resolve(data.trim());
    });

    log
      .log(namespace, podName, container, stream, { tailLines: 1 })
      .catch(() => { clearTimeout(timeout); resolve(''); });
  });

  return {
    promise,
    abort() {
      aborted = true;
      clearTimeout(timeout);
      stream.destroy();
    },
  };
}


export function usePodActivity(pods: PodInfo[]): Map<string, boolean> {
  const [activityMap, setActivityMap] = useState<Map<string, boolean>>(new Map());
  const lastLineRef = useRef<Map<string, string>>(new Map());
  const activityTsRef = useRef<Map<string, number>>(new Map());
  const pollingRef = useRef(false);
  const abortHandlesRef = useRef<(() => void)[]>([]);

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
      // Skip if previous poll is still in flight
      if (pollingRef.current) return;
      pollingRef.current = true;

      const now = Date.now();
      const runningPods = pods.filter((p) => p.status === 'Running' && p.containers.length > 0);

      const tasks = runningPods.map((pod) => () =>
        fetchLastLine(log, pod.namespace, pod.name, pod.containers[0]!)
      );

      // Run with concurrency limit
      const abortHandles: (() => void)[] = [];
      const results: string[] = new Array(tasks.length).fill('');
      let nextIndex = 0;

      async function runNext(): Promise<void> {
        while (nextIndex < tasks.length) {
          if (cancelled) return;
          const i = nextIndex++;
          const { promise, abort } = tasks[i]!();
          abortHandles.push(abort);
          abortHandlesRef.current = abortHandles;
          try {
            results[i] = await promise;
          } catch {
            results[i] = '';
          }
        }
      }

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT, tasks.length) },
        () => runNext()
      );
      await Promise.allSettled(workers);

      pollingRef.current = false;
      if (cancelled) return;

      for (let i = 0; i < runningPods.length; i++) {
        const pod = runningPods[i]!;
        const lastLine = results[i] ?? '';
        if (lastLine) {
          const prev = lastLines.get(pod.name);
          if (prev !== lastLine) {
            lastLines.set(pod.name, lastLine);
            activityTs.set(pod.name, now);
          }
        }
      }

      const next = new Map<string, boolean>();
      for (const pod of pods) {
        const ts = activityTs.get(pod.name) ?? 0;
        next.set(pod.name, now - ts < ACTIVE_THRESHOLD_MS);
      }
      setActivityMap(next);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      // Abort all in-flight requests
      for (const abort of abortHandlesRef.current) {
        abort();
      }
      abortHandlesRef.current = [];
      pollingRef.current = false;
    };
  }, [podKey]);

  return activityMap;
}
