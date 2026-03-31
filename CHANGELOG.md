# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
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
