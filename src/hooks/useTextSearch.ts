import { useState, useCallback, useMemo } from 'react';
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

export function useTextSearch(lines: string[]): UseTextSearchResult {
  const [query, setQueryState] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const matches = useMemo(() => {
    if (!query || query.length === 0) {
      return [];
    }

    const results: SearchMatch[] = [];
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lowerLine = line.toLowerCase();
      let startIndex = 0;

      while (true) {
        const index = lowerLine.indexOf(lowerQuery, startIndex);
        if (index === -1) break;

        results.push({
          lineNumber: i,
          content: line,
          startIndex: index,
          endIndex: index + query.length,
        });

        startIndex = index + 1;
      }
    }

    return results;
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
