import { getRenderer } from '../index';
import { startShellSession } from './shellSession';

let shellActive = false;

export async function launchShell(
  namespace: string,
  podName: string,
  container: string
): Promise<void> {
  if (shellActive) return;
  shellActive = true;

  const renderer = getRenderer();

  try {
    renderer.suspend();

    // Banner
    process.stdout.write('\x1b[2J\x1b[H'); // clear screen
    process.stdout.write(`\x1b[1;36m── Shell: ${podName}/${container} ──\x1b[0m\n`);
    process.stdout.write(`\x1b[90mPress Ctrl+] to exit\x1b[0m\n\n`);

    try {
      await startShellSession(namespace, podName, container, '/bin/bash');
    } catch {
      // bash not available, fallback to sh
      await startShellSession(namespace, podName, container, '/bin/sh');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Shell session failed';
    process.stdout.write(`\n\x1b[31mError: ${msg}\x1b[0m\n`);
    await new Promise((r) => setTimeout(r, 1500));
  } finally {
    shellActive = false;
    renderer.resume();
  }
}
