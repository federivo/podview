import { useState, useEffect, useRef, useCallback } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import { useFileSystem } from '../hooks/useFileSystem';
import { useTheme } from '../theme';
import { Breadcrumb } from './Breadcrumb';
import { Spinner } from './Spinner';
import type { PodInfo, FileEntry } from '../types';

interface FileExplorerProps {
  pod: PodInfo;
  container: string;
  active: boolean;
  onFileSelect: (path: string) => void;
  onBack: () => void;
  onQuit: () => void;
}

function getFileIcon(entry: FileEntry): string {
  if (entry.isDirectory) return '';
  if (entry.name.endsWith('.log')) return '';
  if (entry.name.endsWith('.json')) return '';
  if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) return '';
  if (entry.name.endsWith('.sh') || entry.name.endsWith('.bash')) return '';
  if (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) return '';
  if (entry.name.endsWith('.py')) return '';
  if (entry.name.endsWith('.go')) return '';
  if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) return '';
  if (entry.name.endsWith('.css')) return '';
  if (entry.name.endsWith('.xml')) return '';
  if (entry.name.endsWith('.md')) return '';
  if (entry.name.endsWith('.conf') || entry.name.endsWith('.cfg') || entry.name.endsWith('.ini') || entry.name.endsWith('.env')) return '';
  if (entry.name.endsWith('.lock')) return '';
  if (entry.name.endsWith('.gz') || entry.name.endsWith('.tar') || entry.name.endsWith('.zip')) return '';
  if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.svg')) return '';
  if (entry.name.endsWith('.sql')) return '';
  return '';
}

function formatSize(size: string): string {
  const num = parseInt(size, 10);
  if (isNaN(num)) return size;
  if (num < 1024) return `${num}B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)}K`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)}M`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

export function FileExplorer({
  pod,
  container,
  active,
  onFileSelect,
  onBack,
  onQuit,
}: FileExplorerProps) {
  const theme = useTheme();
  const { height: terminalHeight } = useTerminalDimensions();
  const { entries, currentPath, loading, error, navigateTo, goUp, refresh } =
    useFileSystem(pod, container);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [gotoMode, setGotoMode] = useState(false);
  const [gotoInput, setGotoInput] = useState('');
  const [filterText, setFilterText] = useState('');
  const filterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFilterTimer = useCallback(() => {
    if (filterTimeout.current) {
      clearTimeout(filterTimeout.current);
      filterTimeout.current = null;
    }
  }, []);

  const resetFilterTimer = useCallback(() => {
    clearFilterTimer();
    filterTimeout.current = setTimeout(() => {
      setFilterText('');
    }, 1500);
  }, [clearFilterTimer]);

  useEffect(() => clearFilterTimer, [clearFilterTimer]);

  // Calculate visible height (terminal height minus breadcrumb, status bar, filter bar, and goto bar)
  const extraRows = (gotoMode ? 1 : 0) + (filterText ? 1 : 0);
  const visibleHeight = Math.max(1, terminalHeight - 4 - extraRows);

  useEffect(() => {
    setSelectedIndex(0);
    setScrollOffset(0);
    setFilterText('');
    clearFilterTimer();
  }, [currentPath, clearFilterTimer]);

  useEffect(() => {
    if (selectedIndex >= entries.length && entries.length > 0) {
      setSelectedIndex(entries.length - 1);
    }
  }, [entries.length, selectedIndex]);

  // Keep selection visible by adjusting scroll offset
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, scrollOffset, visibleHeight]);

  useKeyboard((key: KeyEvent) => {
    if (!active) return;

    if (gotoMode) {
      if (key.name === 'escape') {
        setGotoMode(false);
        setGotoInput('');
        return;
      }
      if (key.name === 'return') {
        const path = gotoInput.trim();
        if (path) {
          navigateTo(path.startsWith('/') ? path : `/${path}`);
        }
        setGotoMode(false);
        setGotoInput('');
        return;
      }
      if (key.name === 'backspace') {
        setGotoInput((s) => s.slice(0, -1));
        return;
      }
      if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        setGotoInput((s) => s + key.sequence);
      }
      return;
    }

    if (key.ctrl && (key.name === 'q' || key.name === 'c')) {
      onQuit();
      return;
    }

    if (key.ctrl && key.name === 'g') {
      setGotoMode(true);
      setGotoInput(currentPath);
      return;
    }

    if (key.ctrl && key.name === 'r') {
      refresh();
      return;
    }

    if (key.name === 'escape') {
      if (filterText) {
        setFilterText('');
        clearFilterTimer();
      } else {
        onBack();
      }
      return;
    }

    if (loading) return;

    if (key.name === 'j' || key.name === 'down') {
      setSelectedIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (key.name === 'k' || key.name === 'up') {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (key.name === 'pagedown' || (key.ctrl && key.name === 'f')) {
      setSelectedIndex((i) => Math.min(i + visibleHeight, entries.length - 1));
    } else if (key.name === 'pageup' || (key.ctrl && key.name === 'b')) {
      setSelectedIndex((i) => Math.max(i - visibleHeight, 0));
    } else if (key.name === 'backspace') {
      if (filterText) {
        const next = filterText.slice(0, -1);
        setFilterText(next);
        if (next) {
          resetFilterTimer();
          const idx = entries.findIndex((e) => e.name.toLowerCase().includes(next.toLowerCase()));
          if (idx >= 0) setSelectedIndex(idx);
        } else {
          clearFilterTimer();
        }
      } else {
        goUp();
      }
      return;
    } else if (key.name === 'return') {
      const entry = entries[selectedIndex];
      if (entry) {
        if (entry.isDirectory) {
          const newPath =
            currentPath === '/'
              ? `/${entry.name}`
              : `${currentPath}/${entry.name}`;
          navigateTo(newPath);
        } else {
          const filePath =
            currentPath === '/'
              ? `/${entry.name}`
              : `${currentPath}/${entry.name}`;
          onFileSelect(filePath);
        }
      }
    } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      const next = filterText + key.sequence;
      setFilterText(next);
      resetFilterTimer();
      const idx = entries.findIndex((e) => e.name.toLowerCase().includes(next.toLowerCase()));
      if (idx >= 0) setSelectedIndex(idx);
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <Breadcrumb podName={pod.name} containerName={container} path={currentPath} />

      {loading && (
        <box flexGrow={1} flexDirection="column">
          <box height={1}>
            <Spinner text="Loading directory..." />
          </box>
        </box>
      )}

      {!loading && error && (
        <box height={1}>
          <text>
            <span fg={theme.error}>Error: {error}</span>
          </text>
        </box>
      )}

      {!loading && !error && entries.length === 0 && (
        <box height={1}>
          <text>
            <span fg={theme.textDim}>Empty directory</span>
          </text>
        </box>
      )}

      {!loading && (
      <box flexDirection="column" flexGrow={1}>
        {entries.slice(scrollOffset, scrollOffset + visibleHeight).map((entry, index) => {
          const actualIndex = scrollOffset + index;
          const isSelected = actualIndex === selectedIndex;
          const icon = getFileIcon(entry);

          return (
            <box key={entry.name} height={1} backgroundColor={isSelected ? theme.surface : undefined}>
              <text>
                <span fg={isSelected ? theme.text : entry.isDirectory ? theme.dirColor : theme.textSecondary}>
                  {isSelected ? '▸ ' : '  '}
                  {icon} {entry.name}
                </span>
                {!entry.isDirectory && (
                  <span fg={theme.textDim}> {formatSize(entry.size)}</span>
                )}
              </text>
            </box>
          );
        })}
      </box>
      )}

      {filterText && (
        <box height={1}>
          <text>
            <span fg={theme.warning}>Filter: {filterText}</span>
          </text>
        </box>
      )}

      {gotoMode && (
        <box height={1}>
          <text>
            <span fg={theme.accent}>Go to: </span>
            <span fg={theme.text}>{gotoInput}</span>
            <span fg={theme.accent}>▌</span>
          </text>
        </box>
      )}
    </box>
  );
}
