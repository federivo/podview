import { useState, useCallback } from 'react';
import { useTerminalDimensions } from '@opentui/react';
import { HomeScreen } from './components/HomeScreen';
import { PodList } from './components/PodList';
import { FileExplorer } from './components/FileExplorer';
import { FileViewer } from './components/FileViewer';
import { LogViewer } from './components/LogViewer';
import { LogGrid } from './components/LogGrid';
import { StatusBar } from './components/StatusBar';
import { ThemeContext, themes } from './theme';
import type { Theme } from './theme';
import type { View, PodInfo, LogTarget } from './types';

export function App() {
  const { height: rows } = useTerminalDimensions();
  const [theme, setTheme] = useState<Theme>(themes[0]!);
  const [view, setView] = useState<View>('home');
  const [activeContext, setActiveContext] = useState<string>('');
  const [activeNamespace, setActiveNamespace] = useState<string>('');
  const [selectedPod, setSelectedPod] = useState<PodInfo | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logTargets, setLogTargets] = useState<LogTarget[]>([]);

  const handleEnter = useCallback((context: string, namespace: string) => {
    setActiveContext(context);
    setActiveNamespace(namespace);
    setView('pods');
  }, []);

  const handlePodSelect = useCallback((pod: PodInfo, container: string) => {
    setSelectedPod(pod);
    setSelectedContainer(container);
    setSelectedFile(null);
    setView('explorer');
  }, []);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path);
    setView('viewer');
  }, []);

  const handleBackToExplorer = useCallback(() => {
    setView('explorer');
  }, []);

  const handleOpenLogs = useCallback((targets: LogTarget[]) => {
    setLogTargets(targets);
    if (targets.length === 1) {
      setSelectedPod(targets[0]!.pod);
      setSelectedContainer(targets[0]!.container);
    }
    setView('logs');
  }, []);

  const handleBackToPods = useCallback(() => {
    setView('pods');
    setSelectedPod(null);
    setSelectedContainer(null);
    setSelectedFile(null);
    setLogTargets([]);
  }, []);

  const handleBackToHome = useCallback(() => {
    setView('home');
  }, []);

  const handleQuit = useCallback(() => {
    process.stdout.write('\x1b[?1000l');
    process.stdout.write('\x1b[?1002l');
    process.stdout.write('\x1b[?1003l');
    process.stdout.write('\x1b[?1006l');
    process.stdout.write('\x1b[?25h');
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[2J\x1b[H');
    process.exit(0);
  }, []);

  const content = (() => {
    if (view === 'home') {
      return <HomeScreen onEnter={handleEnter} onThemeChange={setTheme} onQuit={handleQuit} />;
    }

    if (view === 'pods') {
      return (
        <box flexDirection="column" width="100%" height="100%">
          <PodList
            namespace={activeNamespace}
            onSelect={handlePodSelect}
            onLogs={handleOpenLogs}
            onBack={handleBackToHome}
            onQuit={handleQuit}
          />
        </box>
      );
    }

    if (view === 'logs' && logTargets.length > 0) {
      if (logTargets.length === 1) {
        const target = logTargets[0]!;
        const contentHeight = rows - 1;
        return (
          <box flexDirection="column" width="100%" height="100%">
            <LogViewer
              pod={target.pod}
              container={target.container}
              height={contentHeight}
              onBack={handleBackToPods}
              onQuit={handleQuit}
            />
          </box>
        );
      }

      return (
        <LogGrid
          targets={logTargets}
          onBack={handleBackToPods}
          onQuit={handleQuit}
        />
      );
    }

    if (!selectedPod || !selectedContainer) {
      return null;
    }

    const contentHeight = rows - 2;
    const explorerActive = view === 'explorer';
    const viewerActive = view === 'viewer';

    return (
      <box flexDirection="column" width="100%" height="100%">
        <box height={explorerActive ? contentHeight : 0} width="100%">
          <FileExplorer
            pod={selectedPod}
            container={selectedContainer}
            active={explorerActive}
            onFileSelect={handleFileSelect}
            onBack={handleBackToPods}
            onQuit={handleQuit}
          />
        </box>
        {viewerActive && (
          <box height={contentHeight} width="100%">
            <FileViewer
              pod={selectedPod}
              container={selectedContainer}
              filePath={selectedFile}
              height={contentHeight}
              onBack={handleBackToExplorer}
              onQuit={handleQuit}
            />
          </box>
        )}
        <StatusBar
          view={view}
          context={`${selectedPod.name}:${selectedContainer}`}
        />
      </box>
    );
  })();

  return (
    <ThemeContext.Provider value={theme}>
      {content}
    </ThemeContext.Provider>
  );
}
