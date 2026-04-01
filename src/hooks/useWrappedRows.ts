import { useRef, useMemo } from 'react';

export interface WrappedRow {
  lineNumber: number;
  text: string;
  isFirstRow: boolean;
}

function wrapLine(
  line: string,
  lineNumber: number,
  contentWidth: number,
  wrapEnabled: boolean,
): WrappedRow[] {
  if (!wrapEnabled || line.length <= contentWidth) {
    const text = !wrapEnabled && line.length > contentWidth
      ? line.slice(0, contentWidth - 1) + '\u2026'
      : line;
    return [{ lineNumber, text, isFirstRow: true }];
  }
  const rows: WrappedRow[] = [];
  for (let offset = 0; offset < line.length; offset += contentWidth) {
    rows.push({
      lineNumber,
      text: line.slice(offset, offset + contentWidth),
      isFirstRow: offset === 0,
    });
  }
  return rows;
}

export function useWrappedRows(
  lines: string[],
  contentWidth: number,
  wrapEnabled: boolean,
): WrappedRow[] {
  const cacheRef = useRef<{
    rows: WrappedRow[];
    prevLineCount: number;
    prevContentWidth: number;
    prevWrapEnabled: boolean;
  }>({ rows: [], prevLineCount: 0, prevContentWidth: 0, prevWrapEnabled: true });

  return useMemo(() => {
    const cache = cacheRef.current;

    // If contentWidth or wrapEnabled changed, full recompute is needed
    if (cache.prevContentWidth !== contentWidth || cache.prevWrapEnabled !== wrapEnabled) {
      const rows: WrappedRow[] = [];
      for (let i = 0; i < lines.length; i++) {
        rows.push(...wrapLine(lines[i]!, i, contentWidth, wrapEnabled));
      }
      cacheRef.current = { rows, prevLineCount: lines.length, prevContentWidth: contentWidth, prevWrapEnabled: wrapEnabled };
      return rows;
    }

    // Lines were cleared (e.g. user pressed 'c')
    if (lines.length < cache.prevLineCount) {
      const rows: WrappedRow[] = [];
      for (let i = 0; i < lines.length; i++) {
        rows.push(...wrapLine(lines[i]!, i, contentWidth, wrapEnabled));
      }
      cacheRef.current = { rows, prevLineCount: lines.length, prevContentWidth: contentWidth, prevWrapEnabled: wrapEnabled };
      return rows;
    }

    // Incremental: only wrap new lines appended since last render
    if (lines.length > cache.prevLineCount) {
      const newRows = [...cache.rows];
      for (let i = cache.prevLineCount; i < lines.length; i++) {
        newRows.push(...wrapLine(lines[i]!, i, contentWidth, wrapEnabled));
      }
      cacheRef.current = { rows: newRows, prevLineCount: lines.length, prevContentWidth: contentWidth, prevWrapEnabled: wrapEnabled };
      return newRows;
    }

    // No change
    return cache.rows;
  }, [lines, contentWidth, wrapEnabled]);
}
