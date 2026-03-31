import * as k8s from '@kubernetes/client-node';
import { getKubeConfig } from './kubernetes';
import type { Writable } from 'stream';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execInPod(
  namespace: string,
  podName: string,
  container: string,
  command: string[]
): Promise<ExecResult> {
  const kc = getKubeConfig();
  const exec = new k8s.Exec(kc);

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Command timed out after 30s'));
      }
    }, 30000);

    const stdoutStream: Writable = {
      write(chunk: Buffer | string): boolean {
        stdout += chunk.toString();
        return true;
      },
      end() {},
    } as Writable;

    const stderrStream: Writable = {
      write(chunk: Buffer | string): boolean {
        stderr += chunk.toString();
        return true;
      },
      end() {},
    } as Writable;

    exec
      .exec(
        namespace,
        podName,
        container,
        command,
        stdoutStream,
        stderrStream,
        null,
        false,
        (status: k8s.V1Status) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            const exitCode = status.status === 'Success' ? 0 : 1;
            resolve({ stdout, stderr, exitCode });
          }
        }
      )
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
  });
}
