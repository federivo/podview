import { useState, useCallback, useRef, useMemo } from 'react';
import type { SearchMatch } from '../types';

interface UseTextSearchResult {
  query: string;
  matches: SearchMatch[];
  currentMatchIndex: number;
  totalMatches: number;
  setQuery: (query: string) => void;
  nextMatch: () => void;
  previousMatch: () => void;
  clearSearch: () => void;
  isSearching: boolean;
}

function searchLine(line: string, lowerQuery: string, queryLen: number, lineNumber: number): SearchMatch[] {
  const results: SearchMatch[] = [];
  const lowerLine = line.toLowerCase();
  let startIndex = 0;
  while (true) {
    const index = lowerLine.indexOf(lowerQuery, startIndex);
    if (index === -1) break;
    results.push({ lineNumber, content: line, startIndex: index, endIndex: index + queryLen });
    startIndex = index + 1;
  }
  return results;
}

export function useTextSearch(lines: string[]): UseTextSearchResult {
  const [query, setQueryState] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const cacheRef = useRef<{
    matches: SearchMatch[];
    prevQuery: string;
    prevLineCount: number;
  }>({ matches: [], prevQuery: '', prevLineCount: 0 });

  const matches = useMemo(() => {
    if (!query || query.length === 0) {
      cacheRef.current = { matches: [], prevQuery: '', prevLineCount: 0 };
      return [];
    }

    const cache = cacheRef.current;
    const lowerQuery = query.toLowerCase();

    // Query changed or lines shrunk — full recompute
    if (cache.prevQuery !== query || lines.length < cache.prevLineCount) {
      const results: SearchMatch[] = [];
      for (let i = 0; i < lines.length; i++) {
        results.push(...searchLine(lines[i]!, lowerQuery, query.length, i));
      }
      cacheRef.current = { matches: results, prevQuery: query, prevLineCount: lines.length };
      return results;
    }

    // Lines only appended — incrementally search new lines only
    if (lines.length > cache.prevLineCount) {
      const results = [...cache.matches];
      for (let i = cache.prevLineCount; i < lines.length; i++) {
        results.push(...searchLine(lines[i]!, lowerQuery, query.length, i));
      }
      cacheRef.current = { matches: results, prevQuery: query, prevLineCount: lines.length };
      return results;
    }

    // No change
    return cache.matches;
  }, [lines, query]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    setCurrentMatchIndex(0);
    setIsSearching(newQuery.length > 0);
  }, []);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((i) => (i + 1) % matches.length);
  }, [matches.length]);

  const previousMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((i) => (i - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setCurrentMatchIndex(0);
    setIsSearching(false);
  }, []);

  return {
    query,
    matches,
    currentMatchIndex,
    totalMatches: matches.length,
    setQuery,
    nextMatch,
    previousMatch,
    clearSearch,
    isSearching,
  };
}
