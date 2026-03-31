process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createCliRenderer } from '@opentui/core';
import type { CliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { App } from './App';

let rendererInstance: CliRenderer | null = null;

export function getRenderer(): CliRenderer {
  if (!rendererInstance) {
    throw new Error('Renderer not initialized');
  }
  return rendererInstance;
}

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });
  rendererInstance = renderer;
  createRoot(renderer).render(<App />);
}

main().catch(console.error);
