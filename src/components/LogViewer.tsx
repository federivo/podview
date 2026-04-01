import { useState, useEffect, useMemo } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import { useLogStream } from '../hooks/useLogStream';
import { useTextSearch } from '../hooks/useTextSearch';
import { SearchBar } from './SearchBar';
import { Spinner } from './Spinner';
import { useTheme } from '../theme';
import type { PodInfo } from '../types';

interface LogViewerProps {
  pod: PodInfo;
  container: string;
  height: number;
  onBack: () => void;
  onQuit: () => void;
}

interface WrappedRow {
  lineNumber: number;
  text: string;
  isFirstRow: boolean;
}

export function LogViewer({
  pod,
  container,
  height,
  onBack,
  onQuit,
}: LogViewerProps) {
  const theme = useTheme();
  const { width: terminalWidth } = useTerminalDimensions();
  const { lines, loading, error, isStreaming } = useLogStream(
    pod.namespace,
    pod.name,
    container
  );
  const {
    query,
    matches,
    currentMatchIndex,
    totalMatches,
    setQuery,
    nextMatch,
    previousMatch,
    clearSearch,
    isSearching,
  } = useTextSearch(lines);

  const [scrollOffset, setScrollOffset] = useState(0);
  const [isTailing, setIsTailing] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const visibleHeight = height - 3;
  const lineNumberWidth = Math.max(lines.length.toString().length, 3) + 1;
  const contentWidth = Math.max(1, terminalWidth - 2 - lineNumberWidth - 1);

  const wrappedRows = useMemo(() => {
    const rows: WrappedRow[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.length <= contentWidth) {
        rows.push({ lineNumber: i, text: line, isFirstRow: true });
      } else {
        for (let offset = 0; offset < line.length; offset += contentWidth) {
          rows.push({
            lineNumber: i,
            text: line.slice(offset, offset + contentWidth),
            isFirstRow: offset === 0,
          });
        }
      }
    }
    return rows;
  }, [lines, contentWidth]);

  const lineToRowIndex = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < wrappedRows.length; i++) {
      const row = wrappedRows[i]!;
      if (!map.has(row.lineNumber)) {
        map.set(row.lineNumber, i);
      }
    }
    return map;
  }, [wrappedRows]);

  const maxScroll = Math.max(0, wrappedRows.length - visibleHeight);

  // Auto-scroll when tailing
  useEffect(() => {
    if (isTailing) {
      setScrollOffset(maxScroll);
    }
  }, [isTailing, maxScroll]);

  // Scroll to search match
  useEffect(() => {
    if (matches.length > 0 && currentMatchIndex >= 0) {
      const match = matches[currentMatchIndex];
      if (match) {
        const rowIndex = lineToRowIndex.get(match.lineNumber) ?? 0;
        if (rowIndex < scrollOffset) {
          setScrollOffset(rowIndex);
        } else if (rowIndex >= scrollOffset + visibleHeight) {
          setScrollOffset(Math.max(0, rowIndex - visibleHeight + 1));
        }
      }
    }
  }, [currentMatchIndex, matches, scrollOffset, visibleHeight, lineToRowIndex]);

  const matchingLines = useMemo(() => {
    const set = new Set<number>();
    for (const match of matches) {
      set.add(match.lineNumber);
    }
    return set;
  }, [matches]);

  const currentMatchLine = matches[currentMatchIndex]?.lineNumber ?? -1;

  useKeyboard((key: KeyEvent) => {
    if (searchMode) {
      if (key.name === 'escape') {
        setSearchMode(false);
        setSearchInput('');
        return;
      }
      if (key.name === 'return') {
        setQuery(searchInput);
        setSearchMode(false);
        setIsTailing(false);
        return;
      }
      if (key.name === 'backspace') {
        setSearchInput((s) => s.slice(0, -1));
        return;
      }
      if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        setSearchInput((s) => s + key.sequence);
      }
      return;
    }

    if (key.ctrl && (key.name === 'q' || key.name === 'c')) {
      onQuit();
      return;
    }

    if (key.name === 'escape') {
      if (isSearching) {
        clearSearch();
        setIsTailing(true);
      } else {
        onBack();
      }
      return;
    }

    if (key.name === '/' || key.sequence === '/') {
      setSearchMode(true);
      setSearchInput(query);
      return;
    }

    if (key.name === 'n') {
      nextMatch();
      return;
    }

    if (key.shift && key.name === 'n') {
      previousMatch();
      return;
    }

    if (key.name === 'j' || key.name === 'down') {
      setIsTailing(false);
      setScrollOffset((o) => Math.min(o + 1, maxScroll));
    } else if (key.name === 'k' || key.name === 'up') {
      setIsTailing(false);
      setScrollOffset((o) => Math.max(o - 1, 0));
    } else if (key.shift && key.name === 'g') {
      setIsTailing(true);
      setScrollOffset(maxScroll);
    } else if (!key.shift && key.name === 'g') {
      setIsTailing(false);
      setScrollOffset(0);
    } else if (key.name === 'pagedown' || (key.ctrl && key.name === 'f')) {
      setIsTailing(false);
      setScrollOffset((o) => Math.min(o + visibleHeight, maxScroll));
    } else if (key.name === 'pageup' || (key.ctrl && key.name === 'b')) {
      setIsTailing(false);
      setScrollOffset((o) => Math.max(o - visibleHeight, 0));
    }
  });

  if (loading) {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <box height={1}>
          <text>
            <strong><span fg={theme.accent}>Logs: {pod.name}/{container}</span></strong>
          </text>
        </box>
        <box flexGrow={1} justifyContent="center" alignItems="center">
          <Spinner text="Connecting to log stream..." />
        </box>
      </box>
    );
  }

  if (error) {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <box height={1}>
          <text>
            <strong><span fg={theme.accent}>Logs: {pod.name}/{container}</span></strong>
          </text>
        </box>
        <box flexGrow={1}>
          <text>
            <span fg={theme.error}>Error: {error}</span>
          </text>
        </box>
        <box height={1}>
          <text>
            <span fg={theme.textDim}>Press Esc to go back</span>
          </text>
        </box>
      </box>
    );
  }

  const visibleRows = wrappedRows.slice(scrollOffset, scrollOffset + visibleHeight);

  const streamStatus = isStreaming
    ? (isTailing ? ' LIVE' : ' PAUSED')
    : ' ENDED';
  const streamStatusColor = isStreaming
    ? (isTailing ? theme.success : theme.warning)
    : theme.error;

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box height={1}>
        <text>
          <strong><span fg={theme.accent}>Logs: {pod.name}/{container}</span></strong>
          <span fg={streamStatusColor}>{streamStatus}</span>
          {isSearching && (
            <span fg={theme.textDim}> [{currentMatchIndex + 1}/{totalMatches} matches]</span>
          )}
        </text>
      </box>

      <box
        flexDirection="column"
        flexGrow={1}
        border
        borderStyle="single"
      >
        {visibleRows.map((row, index) => {
          const isMatchLine = matchingLines.has(row.lineNumber);
          const isCurrentMatch = row.lineNumber === currentMatchLine;

          return (
            <box key={scrollOffset + index} height={1} backgroundColor={isCurrentMatch ? theme.warning : undefined}>
              <text>
                <span fg={theme.textDim}>
                  {row.isFirstRow
                    ? String(row.lineNumber + 1).padStart(lineNumberWidth, ' ')
                    : ' '.repeat(lineNumberWidth)}│
                </span>
                <span fg={isCurrentMatch ? theme.statusBar : isMatchLine ? theme.warning : theme.text}>
                  {row.text}
                </span>
              </text>
            </box>
          );
        })}
      </box>

      {searchMode ? (
        <SearchBar
          query={searchInput}
          currentMatch={currentMatchIndex}
          totalMatches={totalMatches}
          onQueryChange={setSearchInput}
          onConfirm={() => {
            setQuery(searchInput);
            setSearchMode(false);
            setIsTailing(false);
          }}
        />
      ) : (
        <box height={1}>
          <text>
            <span fg={theme.textDim}>
              Line {(visibleRows[0]?.lineNumber ?? 0) + 1}-{(visibleRows[visibleRows.length - 1]?.lineNumber ?? 0) + 1} of{' '}
              {lines.length}
              {isSearching
                ? ' | n/N: next/prev | Esc: clear'
                : !isTailing
                  ? ' | G: resume tail'
                  : ''
              }
            </span>
          </text>
        </box>
      )}
    </box>
  );
}
