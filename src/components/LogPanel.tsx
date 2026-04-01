import { useState, useEffect, useMemo } from 'react';
import { useKeyboard } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import { useLogStream } from '../hooks/useLogStream';
import { useTextSearch } from '../hooks/useTextSearch';
import { useTheme } from '../theme';
import type { PodInfo } from '../types';

interface LogPanelProps {
  pod: PodInfo;
  container: string;
  width: number;
  height: number;
  active: boolean;
}

interface WrappedRow {
  lineNumber: number;
  text: string;
  isFirstRow: boolean;
}

export function LogPanel({
  pod,
  container,
  width,
  height,
  active,
}: LogPanelProps) {
  const theme = useTheme();
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

  // Account for border (2 chars), title line (1), and status line (1)
  const innerWidth = Math.max(1, width - 2);
  const visibleHeight = Math.max(1, height - 4);
  const contentWidth = Math.max(1, innerWidth);

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

  useEffect(() => {
    if (isTailing) {
      setScrollOffset(maxScroll);
    }
  }, [isTailing, maxScroll]);

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
    if (!active) return;

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

    if (key.name === 'escape') {
      if (isSearching) {
        clearSearch();
        setIsTailing(true);
      }
    }
  });

  const streamIndicator = isStreaming
    ? (isTailing ? '●' : '○')
    : '✕';
  const streamColor = isStreaming
    ? (isTailing ? theme.success : theme.warning)
    : theme.error;

  const borderColor = active ? theme.accent : theme.textDim;
  const shortName = pod.name.length > innerWidth - 4
    ? pod.name.slice(0, innerWidth - 7) + '...'
    : pod.name;

  if (loading) {
    return (
      <box
        flexDirection="column"
        width={width}
        height={height}
        border
        borderStyle="single"
        borderColor={borderColor}
      >
        <box height={1}>
          <text>
            <span fg={borderColor}>{shortName}</span>
          </text>
        </box>
        <box flexGrow={1} justifyContent="center" alignItems="center">
          <text>
            <span fg={theme.textDim}>Connecting...</span>
          </text>
        </box>
      </box>
    );
  }

  if (error) {
    return (
      <box
        flexDirection="column"
        width={width}
        height={height}
        border
        borderStyle="single"
        borderColor={borderColor}
      >
        <box height={1}>
          <text>
            <span fg={borderColor}>{shortName}</span>
          </text>
        </box>
        <box flexGrow={1}>
          <text>
            <span fg={theme.error}>Error: {error}</span>
          </text>
        </box>
      </box>
    );
  }

  const visibleRows = wrappedRows.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <box
      flexDirection="column"
      width={width}
      height={height}
      border
      borderStyle="single"
      borderColor={borderColor}
    >
      <box height={1}>
        <text>
          <span fg={streamColor}>{streamIndicator} </span>
          <span fg={borderColor}>{shortName}</span>
          {searchMode && (
            <span fg={theme.accent}> /{searchInput}</span>
          )}
          {isSearching && !searchMode && (
            <span fg={theme.textDim}> [{currentMatchIndex + 1}/{totalMatches}]</span>
          )}
        </text>
      </box>
      <box flexDirection="column" flexGrow={1}>
        {visibleRows.map((row, index) => {
          const isMatchLine = matchingLines.has(row.lineNumber);
          const isCurrentMatch = row.lineNumber === currentMatchLine;

          return (
            <box key={scrollOffset + index} height={1} backgroundColor={isCurrentMatch ? theme.warning : undefined}>
              <text>
                <span fg={isCurrentMatch ? theme.statusBar : isMatchLine ? theme.warning : theme.text}>
                  {row.text}
                </span>
              </text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
