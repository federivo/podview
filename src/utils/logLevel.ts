import type { Theme } from '../theme';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | null;

const ERROR_PATTERN = /\b(ERROR|FATAL|CRIT(?:ICAL)?|PANIC)\b/i;
const WARN_PATTERN = /\b(WARN(?:ING)?)\b/i;
const INFO_PATTERN = /\b(INFO)\b/i;
const DEBUG_PATTERN = /\b(DEBUG|TRACE|VERBOSE)\b/i;

export function detectLogLevel(line: string): LogLevel {
  if (ERROR_PATTERN.test(line)) return 'error';
  if (WARN_PATTERN.test(line)) return 'warn';
  if (INFO_PATTERN.test(line)) return 'info';
  if (DEBUG_PATTERN.test(line)) return 'debug';
  return null;
}

export function logLevelColor(level: LogLevel, theme: Theme): string | undefined {
  switch (level) {
    case 'error': return theme.error;
    case 'warn': return theme.warning;
    case 'info': return theme.accent;
    case 'debug': return theme.textDim;
    default: return undefined;
  }
}
