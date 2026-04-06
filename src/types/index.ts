export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  containers: string[];
  createdAt: Date;
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: string;
  permissions: string;
  owner: string;
  group: string;
  modified: string;
}

export interface SearchMatch {
  lineNumber: number;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface LogTarget {
  pod: PodInfo;
  container: string;
  filePath?: string;
}

export type View = 'home' | 'pods' | 'explorer' | 'viewer' | 'logs';