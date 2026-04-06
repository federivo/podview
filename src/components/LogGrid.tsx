import { useState, useMemo } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import { LogPanel } from './LogPanel';
import { LogViewer } from './LogViewer';
import { useTheme } from '../theme';
import type { LogTarget } from '../types';

interface LogGridProps {
  targets: LogTarget[];
  onBack: () => void;
  onQuit: () => void;
}

interface GridLayout {
  cols: number;
  rows: number;
}

function computeGrid(count: number): GridLayout {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

export function LogGrid({ targets, onBack, onQuit }: LogGridProps) {
  const theme = useTheme();
  const { width: termWidth, height: termHeight } = useTerminalDimensions();
  const [focusIndex, setFocusIndex] = useState(0);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  const { cols, rows } = useMemo(() => computeGrid(targets.length), [targets.length]);

  const availableHeight = termHeight - 1;
  const panelWidth = Math.floor(termWidth / cols);
  const panelHeight = Math.floor(availableHeight / rows);

  useKeyboard((key: KeyEvent) => {
    if (zoomedIndex !== null) return;

    if (key.ctrl && (key.name === 'q' || key.name === 'c')) {
      onQuit();
      return;
    }

    if (key.name === 'escape') {
      onBack();
      return;
    }

    if (key.name === 'return') {
      setZoomedIndex(focusIndex);
      return;
    }

    if (key.name === 'tab') {
      if (key.shift) {
        setFocusIndex((i) => (i - 1 + targets.length) % targets.length);
      } else {
        setFocusIndex((i) => (i + 1) % targets.length);
      }
      return;
    }
  });

  const gridRows: LogTarget[][] = [];
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const end = Math.min(start + cols, targets.length);
    gridRows.push(targets.slice(start, end));
  }

  const focusedTarget = targets[focusIndex];

  if (zoomedIndex !== null) {
    const target = targets[zoomedIndex]!;
    return (
      <box flexDirection="column" width="100%" height="100%">
        <LogViewer
          pod={target.pod}
          container={target.container}
          height={termHeight}
          onBack={() => setZoomedIndex(null)}
          onQuit={onQuit}
          filePath={target.filePath}
        />
      </box>
    );
  }

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box flexDirection="column" flexGrow={1}>
        {gridRows.map((row, rowIndex) => (
          <box key={rowIndex} flexDirection="row" height={panelHeight}>
            {row.map((target, colIndex) => {
              const globalIndex = rowIndex * cols + colIndex;
              const isLastCol = colIndex === row.length - 1;
              const w = isLastCol ? termWidth - panelWidth * colIndex : panelWidth;

              return (
                <LogPanel
                  key={`${target.pod.name}-${target.container}`}
                  pod={target.pod}
                  container={target.container}
                  width={w}
                  height={panelHeight}
                  active={globalIndex === focusIndex}
                  filePath={target.filePath}
                />
              );
            })}
          </box>
        ))}
      </box>
      <box height={1} backgroundColor={theme.statusBar}>
        <text>
          <span fg={theme.text}>
            {' '}Tab/S-Tab: switch | Enter: zoom | j/k: scroll | G: tail | /: search | w: wrap | t: timestamps | p: pause | Esc: back
            {focusedTarget ? ` | ${focusedTarget.pod.name}` : ''}
          </span>
        </text>
      </box>
    </box>
  );
}
