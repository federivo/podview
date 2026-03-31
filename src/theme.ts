import { createContext, useContext } from 'react';

export interface Theme {
  name: string;
  accent: string;       // primary accent (headings, links, logo)
  text: string;         // main body text
  textSecondary: string; // secondary/muted text
  textDim: string;      // very muted text (line numbers, separators)
  surface: string;      // selection/highlight background
  statusBar: string;    // status bar background
  success: string;      // running, current item
  warning: string;      // pending, filter, search matches
  error: string;        // errors, failed
  dirColor: string;     // directory entries
}

export const themes: Theme[] = [
  {
    name: 'Catppuccin Mocha',
    accent: '#89b4fa',
    text: '#cdd6f4',
    textSecondary: '#a6adc8',
    textDim: '#585b70',
    surface: '#45475a',
    statusBar: '#313244',
    success: '#a6e3a1',
    warning: '#f9e2af',
    error: '#f38ba8',
    dirColor: '#89b4fa',
  },
  {
    name: 'Dracula',
    accent: '#bd93f9',
    text: '#f8f8f2',
    textSecondary: '#bfbfbf',
    textDim: '#6272a4',
    surface: '#44475a',
    statusBar: '#282a36',
    success: '#50fa7b',
    warning: '#f1fa8c',
    error: '#ff5555',
    dirColor: '#8be9fd',
  },
  {
    name: 'Nord',
    accent: '#88c0d0',
    text: '#eceff4',
    textSecondary: '#d8dee9',
    textDim: '#4c566a',
    surface: '#3b4252',
    statusBar: '#2e3440',
    success: '#a3be8c',
    warning: '#ebcb8b',
    error: '#bf616a',
    dirColor: '#81a1c1',
  },
  {
    name: 'Gruvbox Dark',
    accent: '#83a598',
    text: '#ebdbb2',
    textSecondary: '#bdae93',
    textDim: '#665c54',
    surface: '#3c3836',
    statusBar: '#282828',
    success: '#b8bb26',
    warning: '#fabd2f',
    error: '#fb4934',
    dirColor: '#8ec07c',
  },
  {
    name: 'Tokyo Night',
    accent: '#7aa2f7',
    text: '#c0caf5',
    textSecondary: '#a9b1d6',
    textDim: '#565f89',
    surface: '#292e42',
    statusBar: '#1f2335',
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    dirColor: '#7dcfff',
  },
];

export const ThemeContext = createContext<Theme>(themes[0]!);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
