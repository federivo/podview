# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Streaming log viewer: press `l` from pod list to open real-time logs (`kubectl logs -f` subprocess)
- Auto-tail mode in log viewer: scrolls to bottom as new lines arrive; manual scroll with `j/k` pauses it, `G` resumes
- In-log search with `/`, `n/N` to cycle through matches
- 50k line ring buffer with batched rendering to prevent memory growth
- Log level coloring: ERROR in red, WARN in yellow, INFO in accent color, DEBUG dimmed
- `w` key to toggle word wrap (truncates with `...` when off)
- `t` key to toggle RFC3339 timestamps on/off
- `p` key to pause/resume the log stream (actual subprocess pause, not just scroll hold)
- `c` key to clear the log buffer while keeping the stream alive (shows only new logs from that point)
- Stream status indicator in header: LIVE, SCROLL, PAUSED, ENDED
- Multi-pod selection: `Space` marks/unmarks pods in the pod list; marked pods show a checkmark and count in header
- `l` with marked pods opens a multi-pod log grid instead of single viewer
- Multi-pod log grid with smart layout using `ceil(sqrt(n))` columns
- Each grid panel has independent scroll, auto-tail, and search state
- `Tab` / `Shift+Tab` to switch focus between panels in the grid
- `Enter` to zoom a focused panel to fullscreen; `Esc` returns to grid
- Activity indicators: green dot next to pods with recent log activity, polled every 3 seconds via K8s API (`tailLines: 1`)
- Marked pods are cleared automatically when returning from the log view
- New files: `hooks/useLogStream.ts`, `hooks/usePodActivity.ts`, `components/LogViewer.tsx`, `components/LogPanel.tsx`, `components/LogGrid.tsx`, `utils/logLevel.ts`

### Changed
- Pod list now shows multi-select count in header when pods are marked
- README updated with log viewer features, new keyboard shortcuts, and updated project structure

### Fixed
- `/` search in pod list that filters the list in real time, showing only matching pods
- Navigation with `j/k` within filtered results, `Esc` to cancel, `Enter` to select
- `.autonode.yml` config for Node 22 (used by typecheck)
- Project-specific CLAUDE.md with architecture overview and development commands
- CHANGELOG.md to track version history

## [0.1.0] - Initial Release

### Added
- Home screen with context, namespace, and theme selection
- Pod list with real-time filtering and status indicators
- File explorer for browsing pod filesystems
- File viewer with line numbers and in-file search
- Interactive shell sessions (Ctrl+S) with bash/sh fallback
- 5 color themes: Catppuccin, Dracula, Nord, Gruvbox, Tokyo Night
- Vim-style keyboard navigation across all screens
- Shell availability detection before launching sessions
- File explorer starts in container's WORKDIR
- MIT license
