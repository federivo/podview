import { execInPod } from './podExec';
import type { FileEntry } from '../types';

export async function listDirectory(
  namespace: string,
  podName: string,
  container: string,
  path: string
): Promise<FileEntry[]> {
  const result = await execInPod(namespace, podName, container, [
    'ls',
    '-la',
    path,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to list directory');
  }

  const lines = result.stdout.trim().split('\n');
  const entries: FileEntry[] = [];

  for (const line of lines.slice(1)) {
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;

    const permissions = parts[0]!;
    const owner = parts[2]!;
    const group = parts[3]!;
    const size = parts[4]!;
    const modified = `${parts[5]} ${parts[6]} ${parts[7]}`;
    const name = parts.slice(8).join(' ');

    if (name === '.' || name === '..') continue;

    entries.push({
      name,
      isDirectory: permissions.startsWith('d'),
      size,
      permissions,
      owner,
      group,
      modified,
    });
  }

  return entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(
  namespace: string,
  podName: string,
  container: string,
  path: string
): Promise<string> {
  const result = await execInPod(namespace, podName, container, [
    'cat',
    path,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to read file');
  }

  return result.stdout;
}

export async function directoryExists(
  namespace: string,
  podName: string,
  container: string,
  path: string
): Promise<boolean> {
  const result = await execInPod(namespace, podName, container, [
    'test',
    '-d',
    path,
  ]);
  return result.exitCode === 0;
}
