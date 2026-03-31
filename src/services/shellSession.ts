import * as k8s from '@kubernetes/client-node';
import { PassThrough, Transform } from 'stream';
import { getKubeConfig } from './kubernetes';

const CTRL_CLOSE_BRACKET = 0x1d; // Ctrl+]

export async function startShellSession(
  namespace: string,
  podName: string,
  container: string,
  shell: string = '/bin/sh'
): Promise<void> {
  const kc = getKubeConfig();
  const exec = new k8s.Exec(kc);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let ws: { readyState: number; close: () => void; send: (data: Buffer) => void; on: (event: string, cb: (...args: any[]) => void) => void } | null = null;

    // Transform that filters out Ctrl+] and signals exit
    const stdinFilter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (chunk.includes(CTRL_CLOSE_BRACKET)) {
          finish();
          callback();
          return;
        }
        callback(null, chunk);
      },
    });

    function finish(err?: Error) {
      if (settled) return;
      settled = true;
      process.stdin.unpipe(stdinFilter);
      stdinFilter.end();
      process.stdout.removeListener('resize', onResize);
      if (ws) {
        try { ws.close(); } catch {}
      }
      if (err) reject(err);
      else resolve();
    }

    function onResize() {
      if (ws && ws.readyState === 1) {
        const cols = process.stdout.columns || 80;
        const rows = process.stdout.rows || 24;
        const resizeMsg = JSON.stringify({ Width: cols, Height: rows });
        const buf = Buffer.alloc(1 + resizeMsg.length);
        buf[0] = 4; // resize channel
        buf.write(resizeMsg, 1);
        ws.send(buf);
      }
    }

    // Set up stdin: raw mode, flowing, piped through filter
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.pipe(stdinFilter);
    process.stdout.on('resize', onResize);

    exec
      .exec(
        namespace,
        podName,
        container,
        [shell],
        process.stdout,
        process.stderr,
        stdinFilter,
        true, // tty
        (_status: k8s.V1Status) => {
          finish();
        }
      )
      .then((websocket) => {
        ws = websocket;
        websocket.on('close', () => finish());
        websocket.on('error', (err: Error) => finish(err));
      })
      .catch((err) => finish(err));
  });
}
