import * as k8s from '@kubernetes/client-node';

let kc: k8s.KubeConfig | null = null;
let coreApi: k8s.CoreV1Api | null = null;

export function getKubeConfig(): k8s.KubeConfig {
  if (!kc) {
    kc = new k8s.KubeConfig();
    try {
      kc.loadFromDefault();
    } catch (err) {
      throw new Error(
        `Failed to load kubeconfig: ${err instanceof Error ? err.message : 'unknown error'}. ` +
        'Make sure ~/.kube/config exists or KUBECONFIG is set.'
      );
    }
  }
  return kc;
}

export function getCoreApi(): k8s.CoreV1Api {
  if (!coreApi) {
    coreApi = getKubeConfig().makeApiClient(k8s.CoreV1Api);
  }
  return coreApi;
}

export function getCurrentNamespace(): string {
  const kc = getKubeConfig();
  const context = kc.getCurrentContext();
  const contextObj = kc.getContexts().find((c) => c.name === context);
  return contextObj?.namespace || 'default';
}

export function getCurrentContext(): string {
  return getKubeConfig().getCurrentContext();
}

export function getContexts(): string[] {
  return getKubeConfig().getContexts().map((c) => c.name);
}

export function setContext(contextName: string): void {
  const config = getKubeConfig();
  config.setCurrentContext(contextName);
  // Reset the API client so it picks up the new context
  coreApi = null;
}

export async function getNamespaces(): Promise<string[]> {
  try {
    const api = getCoreApi();
    const response = await api.listNamespace();
    return (response.items || [])
      .map((ns) => ns.metadata?.name || '')
      .filter(Boolean)
      .sort();
  } catch {
    return ['default'];
  }
}
