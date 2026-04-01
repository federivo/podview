import { useState, useEffect, useRef, useCallback } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import { usePods } from '../hooks/usePods';
import { useTheme } from '../theme';
import type { Theme } from '../theme';
import { launchShell } from '../services/launchShell';
import { Spinner } from './Spinner';
import type { PodInfo } from '../types';

interface PodListProps {
  namespace: string;
  onSelect: (pod: PodInfo, container: string) => void;
  onLogs: (pod: PodInfo, container: string) => void;
  onBack: () => void;
  onQuit: () => void;
}

function getStatusColor(status: string, theme: Theme): string {
  switch (status) {
    case 'Running':
      return theme.success;
    case 'Pending':
      return theme.warning;
    case 'Succeeded':
      return theme.accent;
    case 'Failed':
      return theme.error;
    default:
      return theme.textDim;
  }
}

export function PodList({ namespace, onSelect, onLogs, onBack, onQuit }: PodListProps) {
  const theme = useTheme();
  const { height: terminalHeight } = useTerminalDimensions();
  const { pods, loading, error, refresh } = usePods(namespace);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerIndex, setContainerIndex] = useState(0);
  const [selectingContainer, setSelectingContainer] = useState(false);
  const [shellMode, setShellMode] = useState(false);
  const [logsMode, setLogsMode] = useState(false);
  const [filterText, setFilterText] = useState('');
  const filterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');

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

  const filteredPods = searchMode && searchText
    ? pods.filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase()))
    : pods;

  const headerLines = 1 + (filterText ? 1 : 0) + (searchMode ? 1 : 0);
  const visibleHeight = Math.max(1, terminalHeight - headerLines - 1);

  useEffect(() => {
    if (selectedIndex >= filteredPods.length && filteredPods.length > 0) {
      setSelectedIndex(filteredPods.length - 1);
    }
  }, [filteredPods.length, selectedIndex]);

  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, scrollOffset, visibleHeight]);

  useKeyboard((key: KeyEvent) => {
    if (key.ctrl && (key.name === 'q' || key.name === 'c')) {
      onQuit();
      return;
    }

    if (key.ctrl && key.name === 'r') {
      refresh();
      return;
    }

    if (key.ctrl && key.name === 's') {
      const pod = filteredPods[selectedIndex];
      if (pod) {
        if (pod.containers.length === 1) {
          launchShell(namespace, pod.name, pod.containers[0]!);
        } else {
          setShellMode(true);
          setSelectingContainer(true);
          setContainerIndex(0);
        }
      }
      return;
    }

    if (key.sequence === 'l' && !selectingContainer && !searchMode) {
      const pod = filteredPods[selectedIndex];
      if (pod) {
        if (pod.containers.length === 1) {
          onLogs(pod, pod.containers[0]!);
        } else {
          setLogsMode(true);
          setSelectingContainer(true);
          setContainerIndex(0);
        }
      }
      return;
    }

    if (selectingContainer) {
      const pod = filteredPods[selectedIndex];
      if (!pod) return;

      if (key.name === 'j' || key.name === 'down') {
        setContainerIndex((i) => Math.min(i + 1, pod.containers.length - 1));
      } else if (key.name === 'k' || key.name === 'up') {
        setContainerIndex((i) => Math.max(i - 1, 0));
      } else if (key.name === 'return') {
        const container = pod.containers[containerIndex];
        if (container) {
          if (shellMode) {
            launchShell(namespace, pod.name, container);
            setShellMode(false);
          } else if (logsMode) {
            onLogs(pod, container);
            setLogsMode(false);
          } else {
            onSelect(pod, container);
          }
        }
        setSelectingContainer(false);
        setContainerIndex(0);
      } else if (key.name === 'escape') {
        setSelectingContainer(false);
        setContainerIndex(0);
        setShellMode(false);
        setLogsMode(false);
      }
      return;
    }

    if (searchMode) {
      if (key.name === 'escape') {
        setSearchMode(false);
        setSearchText('');
        setSelectedIndex(0);
        setScrollOffset(0);
        return;
      } else if (key.name === 'return') {
        const pod = filteredPods[selectedIndex];
        if (pod) {
          if (pod.containers.length === 1) {
            onSelect(pod, pod.containers[0]!);
          } else {
            setSelectingContainer(true);
            setContainerIndex(0);
          }
        }
        return;
      } else if (key.name === 'j' || key.name === 'down') {
        setSelectedIndex((i) => Math.min(i + 1, filteredPods.length - 1));
      } else if (key.name === 'k' || key.name === 'up') {
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (key.name === 'backspace') {
        const next = searchText.slice(0, -1);
        setSearchText(next);
        setSelectedIndex(0);
        setScrollOffset(0);
      } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        setSearchText((t) => t + key.sequence);
        setSelectedIndex(0);
        setScrollOffset(0);
      }
      return;
    }

    if (key.name === 'j' || key.name === 'down') {
      setSelectedIndex((i) => Math.min(i + 1, filteredPods.length - 1));
    } else if (key.name === 'k' || key.name === 'up') {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (key.name === 'pagedown' || (key.ctrl && key.name === 'f')) {
      setSelectedIndex((i) => Math.min(i + visibleHeight, filteredPods.length - 1));
    } else if (key.name === 'pageup' || (key.ctrl && key.name === 'b')) {
      setSelectedIndex((i) => Math.max(i - visibleHeight, 0));
    } else if (key.name === 'escape') {
      if (filterText) {
        setFilterText('');
        clearFilterTimer();
      } else {
        onBack();
      }
      return;
    } else if (key.name === 'backspace') {
      if (filterText) {
        const next = filterText.slice(0, -1);
        setFilterText(next);
        if (next) {
          resetFilterTimer();
          const idx = filteredPods.findIndex((p) => p.name.toLowerCase().includes(next.toLowerCase()));
          if (idx >= 0) setSelectedIndex(idx);
        } else {
          clearFilterTimer();
        }
      }
      return;
    } else if (key.sequence === '/') {
      setSearchMode(true);
      setSearchText('');
      setSelectedIndex(0);
      setScrollOffset(0);
      return;
    } else if (key.name === 'return') {
      const pod = filteredPods[selectedIndex];
      if (pod) {
        if (pod.containers.length === 1) {
          onSelect(pod, pod.containers[0]!);
        } else {
          setSelectingContainer(true);
          setContainerIndex(0);
        }
      }
    } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      const next = filterText + key.sequence;
      setFilterText(next);
      resetFilterTimer();
      const idx = filteredPods.findIndex((p) => p.name.toLowerCase().includes(next.toLowerCase()));
      if (idx >= 0) setSelectedIndex(idx);
    }
  });

  if (loading) {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <box height={1}>
          <Spinner text={`Loading pods from namespace ${namespace}...`} />
        </box>
      </box>
    );
  }

  if (error) {
    return (
      <box flexDirection="column">
        <text>
          <span fg={theme.error}>Error: {error}</span>
        </text>
        <text>
          <span fg={theme.textDim}>Press ^R to retry</span>
        </text>
      </box>
    );
  }

  if (pods.length === 0) {
    return (
      <box flexDirection="column">
        <text>
          <span fg={theme.warning}>No pods found in namespace {namespace}</span>
        </text>
        <text>
          <span fg={theme.textDim}>Press ^R to refresh</span>
        </text>
      </box>
    );
  }

  const selectedPod = filteredPods[selectedIndex];

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box height={1}>
        <text>
          <strong><span fg={theme.accent}>Pods in {namespace}</span></strong>
          <span fg={theme.textDim}> ({filteredPods.length}{searchMode ? `/${pods.length}` : ''} pods)</span>
        </text>
      </box>
      {searchMode && (
        <box height={1}>
          <text>
            <span fg={theme.accent}>/{searchText}</span>
            <span fg={theme.textDim}>{filteredPods.length === 0 ? ' — no matches' : ''}</span>
          </text>
        </box>
      )}
      {filterText && !searchMode && (
        <box height={1}>
          <text>
            <span fg={theme.warning}>Filter: {filterText}</span>
          </text>
        </box>
      )}
      <box flexDirection="column" flexGrow={1}>
        {filteredPods.slice(scrollOffset, scrollOffset + visibleHeight).map((pod, index) => {
          const actualIndex = scrollOffset + index;
          const isSelected = actualIndex === selectedIndex;
          const statusColor = getStatusColor(pod.status, theme);

          return (
            <box key={pod.name} height={1} backgroundColor={isSelected ? theme.surface : undefined}>
              <text>
                <span fg={isSelected ? theme.text : theme.textSecondary}>
                  {isSelected ? '▸ ' : '  '}
                  {pod.name}
                </span>
                <span fg={statusColor}> [{pod.status}]</span>
                {pod.containers.length > 1 && (
                  <span fg={theme.textDim}> ({pod.containers.length} containers)</span>
                )}
              </text>
            </box>
          );
        })}
      </box>

      {selectingContainer && selectedPod && (
        <box
          flexDirection="column"
          border
          borderStyle="single"
          padding={1}
        >
          <text>
            <strong><span fg={theme.accent}>Select container:</span></strong>
          </text>
          {selectedPod.containers.map((container, index) => {
            const isSelected = index === containerIndex;
            return (
              <box key={container} height={1} backgroundColor={isSelected ? theme.surface : undefined}>
                <text>
                  <span fg={isSelected ? theme.text : theme.textSecondary}>
                    {isSelected ? '▸ ' : '  '}
                    {container}
                  </span>
                </text>
              </box>
            );
          })}
        </box>
      )}

      <box height={1} backgroundColor={theme.statusBar}>
        <text>
          <span fg={theme.text}>
            {searchMode
              ? ' j/k: navigate | Enter: select | Esc: cancel search '
              : ' j/k: navigate | /: search | type: filter | Enter: select | l: logs | ^S: shell | ^R: refresh | Esc: back | ^Q: quit '}
          </span>
        </text>
      </box>
    </box>
  );
}
