import { useTheme } from '../theme';
import type { View } from '../types';

interface StatusBarProps {
  view: View;
  context?: string;
  searchMode?: boolean;
}

export function StatusBar({ view, context, searchMode }: StatusBarProps) {
  const theme = useTheme();
  let helpText = '';

  if (searchMode) {
    helpText = 'Enter: confirm | Esc: cancel | Type to search';
  } else if (view === 'pods') {
    helpText = 'j/k: navigate | PgDn/PgUp: page | Enter: select | ^Q: quit';
  } else if (view === 'viewer') {
    helpText = 'j/k: scroll | PgDn/PgUp: page | /: search | n/N: next/prev | Esc: back | ^Q: quit';
  } else {
    helpText = 'j/k: navigate | PgDn/PgUp: page | type: filter | Enter: open | ^G: go to | Backspace: parent | Esc: pods | ^Q: quit';
  }

  return (
    <box height={1} width="100%" backgroundColor={theme.statusBar}>
      <text>
        <span fg={theme.text}>
          {' '}
          {context ? `${context} | ` : ''}
          {helpText}{' '}
        </span>
      </text>
    </box>
  );
}
