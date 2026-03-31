# podview

[![GitHub](https://img.shields.io/github/license/federivo/podview)](https://github.com/federivo/podview/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![Kubernetes](https://img.shields.io/badge/kubernetes-client-326ce5?logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

A terminal UI for browsing Kubernetes pod filesystems and spawning interactive shells. Navigate directories, view file contents, and shell into containers — all from your terminal.

## Why

When debugging or inspecting running pods, the typical workflow involves chaining `kubectl exec` commands to list files, cat contents, and open shells. podview wraps all of that into a single interactive TUI with vim-style navigation, search, and type-ahead filtering.

## Features

- **Home screen** with context and namespace selection
- **Pod list** with `/` search, type-ahead filtering, and status indicators
- **Directory browser** with go-to path, filtering, and automatic `/var/www/html` detection
- **File viewer** with line wrapping, `/` search, and vim-style scrolling (`j/k`, `g/G`, `Ctrl+F/B`)
- **Interactive shell** into containers (`Ctrl+S`) — tries bash, falls back to sh
- **5 color themes** — Catppuccin Mocha, Dracula, Nord, Gruvbox Dark, Tokyo Night

## Prerequisites

- [Bun](https://bun.sh) runtime
- A valid `~/.kube/config` (or `KUBECONFIG` environment variable)
- A [Nerd Font](https://www.nerdfonts.com) for file icons (optional but recommended)

## Getting Started

```sh
# Install dependencies
bun install

# Run
bun run start
```

## Build

Compile to a standalone binary:

```sh
bun run build
```

This produces a `podview` executable in the project root. Move it to a directory in your `$PATH` to use it from anywhere:

```sh
sudo mv podview /usr/local/bin/
```

## Keyboard Shortcuts

### Home Screen
| Key | Action |
|-----|--------|
| `j/k` | Switch field |
| `Enter` | Open dropdown / Continue |
| `Esc` | Close dropdown |
| `Ctrl+Q` | Quit |

### Pod List
| Key | Action |
|-----|--------|
| `j/k` | Navigate |
| `PgDn/PgUp` | Page navigation |
| `/` | Search pods (filters list) |
| Type | Quick filter (type-ahead) |
| `Enter` | Select pod |
| `Ctrl+S` | Shell into pod |
| `Ctrl+R` | Refresh |
| `Esc` | Cancel search / Back to home |
| `Ctrl+Q` | Quit |

### Directory Browser
| Key | Action |
|-----|--------|
| `j/k` | Navigate |
| `PgDn/PgUp` | Page navigation |
| Type | Filter entries |
| `Enter` | Open file/directory |
| `Backspace` | Parent directory |
| `Ctrl+S` | Shell into container |
| `Ctrl+G` | Go to path |
| `Ctrl+R` | Refresh |
| `Esc` | Back to pods |
| `Ctrl+Q` | Quit |

### File Viewer
| Key | Action |
|-----|--------|
| `j/k` | Scroll |
| `PgDn/PgUp` | Page scroll |
| `g` | Go to top |
| `Shift+G` | Go to bottom |
| `/` | Search |
| `n/N` | Next/previous match |
| `Esc` | Clear search / Back to directory |
| `Ctrl+Q` | Quit |

### Shell
| Key | Action |
|-----|--------|
| `Ctrl+]` | Exit shell and return to TUI |

## Tech Stack

- **Runtime** — [Bun](https://bun.sh)
- **UI** — [React](https://react.dev) + [OpenTUI](https://github.com/anthropics/opentui) (terminal UI framework)
- **Kubernetes** — [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)
- **Language** — TypeScript

## Project Structure

```
src/
  index.tsx              Entry point, renderer setup
  App.tsx                View routing and state management
  theme.ts               Color theme definitions and context
  types/index.ts         TypeScript interfaces
  components/
    HomeScreen.tsx       Context/namespace/theme selection
    PodList.tsx          Pod listing with filter
    FileExplorer.tsx     Directory browser
    FileViewer.tsx       File content viewer with search
    Breadcrumb.tsx       Path navigation header
    SearchBar.tsx        In-file search input
    StatusBar.tsx        Help text footer
    Spinner.tsx          Loading animation
  hooks/
    usePods.ts           Pod fetching
    useFileSystem.ts     Directory listing state
    useFileContent.ts    File content state
    useTextSearch.ts     Search logic
  services/
    kubernetes.ts        K8s client configuration
    podExec.ts           Command execution in pods
    fileOperations.ts    File/directory operations
    shellSession.ts      Interactive shell session
    launchShell.ts       Shell launch orchestration
```

## TLS Notice

By default, podview disables TLS certificate verification (`NODE_TLS_REJECT_UNAUTHORIZED=0` in `src/index.tsx`). This is set to support clusters with self-signed certificates, which is common in development and internal environments. If your cluster uses valid TLS certificates and you want strict verification, remove that line from `src/index.tsx`.

## License

MIT
