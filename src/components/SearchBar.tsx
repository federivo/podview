import { useTheme } from '../theme';

interface SearchBarProps {
  query: string;
  currentMatch: number;
  totalMatches: number;
  onQueryChange: (query: string) => void;
  onConfirm: () => void;
}

export function SearchBar({
  query,
  currentMatch,
  totalMatches,
  onQueryChange,
  onConfirm,
}: SearchBarProps) {
  const theme = useTheme();
  return (
    <box height={1} width="100%">
      <text>
        <span fg={theme.accent}>/</span>
      </text>
      <input
        placeholder="Search..."
        focused
        onInput={onQueryChange}
        onSubmit={onConfirm}
      />
      {totalMatches > 0 && (
        <text>
          <span fg={theme.textDim}>
            {' '}
            [{currentMatch + 1}/{totalMatches}]
          </span>
        </text>
      )}
      {query.length > 0 && totalMatches === 0 && (
        <text>
          <span fg={theme.error}> [No matches]</span>
        </text>
      )}
    </box>
  );
}
