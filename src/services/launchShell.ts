import { getRenderer } from '../index';
import { execInPod } from './podExec';
import { startShellSession } from './shellSession';

let shellActive = false;

async function detectShell(
  namespace: string,
  podName: string,
  container: string
): Promise<string> {
  const result = await execInPod(namespace, podName, container, [
    'test', '-x', '/bin/bash',
  ]);
  return result.exitCode === 0 ? '/bin/bash' : '/bin/sh';
}

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

    process.stdout.write('\x1b[2J\x1b[H'); // clear screen
    process.stdout.write(`\x1b[1;36m── Shell: ${podName}/${container} ──\x1b[0m\n`);
    process.stdout.write(`\x1b[90mDetecting shell...\x1b[0m\n`);

    const shell = await detectShell(namespace, podName, container);

    process.stdout.write(`\x1b[90mUsing ${shell} — Press Ctrl+] to exit\x1b[0m\n\n`);

    await startShellSession(namespace, podName, container, shell);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Shell session failed';
    process.stdout.write(`\n\x1b[31mError: ${msg}\x1b[0m\n`);
    await new Promise((r) => setTimeout(r, 1500));
  } finally {
    shellActive = false;
    renderer.resume();
  }
}
