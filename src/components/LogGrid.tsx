import { useState, useMemo } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import { LogPanel } from './LogPanel';
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

  const { cols, rows } = useMemo(() => computeGrid(targets.length), [targets.length]);

  // Reserve 1 line for the bottom status bar
  const availableHeight = termHeight - 1;
  const panelWidth = Math.floor(termWidth / cols);
  const panelHeight = Math.floor(availableHeight / rows);

  useKeyboard((key: KeyEvent) => {
    if (key.ctrl && (key.name === 'q' || key.name === 'c')) {
      onQuit();
      return;
    }

    if (key.name === 'escape') {
      onBack();
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

  // Build rows of panels
  const gridRows: LogTarget[][] = [];
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const end = Math.min(start + cols, targets.length);
    gridRows.push(targets.slice(start, end));
  }

  const focusedTarget = targets[focusIndex];

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box flexDirection="column" flexGrow={1}>
        {gridRows.map((row, rowIndex) => (
          <box key={rowIndex} flexDirection="row" height={panelHeight}>
            {row.map((target, colIndex) => {
              const globalIndex = rowIndex * cols + colIndex;
              const isLastCol = colIndex === row.length - 1;
              // Give extra width to the last column to fill remaining space
              const w = isLastCol ? termWidth - panelWidth * colIndex : panelWidth;

              return (
                <LogPanel
                  key={`${target.pod.name}-${target.container}`}
                  pod={target.pod}
                  container={target.container}
                  width={w}
                  height={panelHeight}
                  active={globalIndex === focusIndex}
                />
              );
            })}
          </box>
        ))}
      </box>
      <box height={1} backgroundColor={theme.statusBar}>
        <text>
          <span fg={theme.text}>
            {' '}Tab/S-Tab: switch panel | j/k: scroll | G: tail | /: search | Esc: back | ^Q: quit
            {focusedTarget ? ` | Focus: ${focusedTarget.pod.name}` : ''}
          </span>
        </text>
      </box>
    </box>
  );
}
