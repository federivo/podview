# podview

[![Release](https://img.shields.io/github/v/release/federivo/podview)](https://github.com/federivo/podview/releases)
[![GitHub](https://img.shields.io/github/license/federivo/podview)](https://github.com/federivo/podview/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![Kubernetes](https://img.shields.io/badge/kubernetes-client-326ce5?logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**Browse files, view content, and shell into your Kubernetes pods — without leaving the terminal.**

podview is an interactive TUI that replaces the repetitive `kubectl exec` workflow with vim-style navigation, real-time search, and type-ahead filtering across pods, directories, and files.

## Features

- **Context & namespace selector** — switch clusters and namespaces from the home screen
- **Pod list** — type-ahead filtering, status indicators, multi-container support
- **Directory browser** — starts in the container's working directory, with go-to path and filtering
- **File viewer** — line wrapping, `/` search with match highlighting, vim-style scrolling
- **Interactive shell** — `Ctrl+S` to drop into bash (or sh) inside any container
- **5 color themes** — Catppuccin Mocha, Dracula, Nord, Gruvbox Dark, Tokyo Night

## Installation

### Download binary

Grab the latest binary from [Releases](https://github.com/federivo/podview/releases):

```sh
# macOS (Apple Silicon)
curl -L https://github.com/federivo/podview/releases/latest/download/podview-darwin-arm64 -o podview

# Linux (x64)
curl -L https://github.com/federivo/podview/releases/latest/download/podview-linux-x64 -o podview

# Linux (ARM64)
curl -L https://github.com/federivo/podview/releases/latest/download/podview-linux-arm64 -o podview

chmod +x podview
sudo mv podview /usr/local/bin/
```

### Build from source

```sh
git clone https://github.com/federivo/podview.git
cd podview
bun install
bun run build
sudo mv podview /usr/local/bin/
```

### Run directly with Bun

```sh
git clone https://github.com/federivo/podview.git
cd podview
bun install
bun run start
```

## Prerequisites

- A valid `~/.kube/config` (or `KUBECONFIG` environment variable)
- A [Nerd Font](https://www.nerdfonts.com) for file icons (optional but recommended)
- [Bun](https://bun.sh) runtime (only if building from source or running directly)

<details>
<summary><strong>Keyboard Shortcuts</strong></summary>

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
| Type | Filter pods |
| `Enter` | Select pod |
| `Ctrl+S` | Shell into pod |
| `Ctrl+R` | Refresh |
| `Esc` | Back to home |
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

</details>

## Tech Stack

- **Runtime** — [Bun](https://bun.sh)
- **UI** — [React](https://react.dev) + [OpenTUI](https://github.com/anthropics/opentui) (terminal UI framework)
- **Kubernetes** — [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)
- **Language** — TypeScript

<details>
<summary><strong>Project Structure</strong></summary>

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

</details>

## TLS Notice

By default, podview disables TLS certificate verification (`NODE_TLS_REJECT_UNAUTHORIZED=0` in `src/index.tsx`). This is set to support clusters with self-signed certificates, which is common in development and internal environments. If your cluster uses valid TLS certificates and you want strict verification, remove that line from `src/index.tsx`.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

[MIT](LICENSE)
