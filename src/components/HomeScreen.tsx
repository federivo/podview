import { useState, useEffect } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { KeyEvent } from '@opentui/core';
import {
  getCurrentContext,
  getCurrentNamespace,
  getContexts,
  getNamespaces,
  setContext,
} from '../services/kubernetes';
import { themes, useTheme } from '../theme';
import type { Theme } from '../theme';

interface HomeScreenProps {
  onEnter: (context: string, namespace: string) => void;
  onThemeChange: (theme: Theme) => void;
  onQuit: () => void;
}

const HELM = [
  '     ___     ',
  '    ╱ ● ╲    ',
  '   ╱  │  ╲   ',
  '  ●───┼───●  ',
  '   ╲  │  ╱   ',
  '    ╲_●_╱    ',
  '             ',
];

const LOGO = [
  ' ██████╗  ██████╗ ██████╗ ██╗   ██╗██╗███████╗██╗    ██╗',
  ' ██╔══██╗██╔═══██╗██╔══██╗██║   ██║██║██╔════╝██║    ██║',
  ' ██████╔╝██║   ██║██║  ██║██║   ██║██║█████╗  ██║ █╗ ██║',
  ' ██╔═══╝ ██║   ██║██║  ██║╚██╗ ██╔╝██║██╔══╝  ██║███╗██║',
  ' ██║     ╚██████╔╝██████╔╝ ╚████╔╝ ██║███████╗╚███╔███╔╝',
  ' ╚═╝      ╚═════╝ ╚═════╝   ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ ',
];

const FIELDS = ['context', 'namespace', 'theme', 'continue'] as const;
type Field = (typeof FIELDS)[number];

export function HomeScreen({ onEnter, onThemeChange, onQuit }: HomeScreenProps) {
  const theme = useTheme();
  const { height: terminalHeight } = useTerminalDimensions();
  const [activeField, setActiveField] = useState<Field>('context');
  const [contexts, setContexts] = useState<string[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState(getCurrentContext());
  const [selectedNamespace, setSelectedNamespace] = useState(getCurrentNamespace());
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [dropdownScroll, setDropdownScroll] = useState(0);

  const maxDropdownHeight = Math.max(3, Math.min(15, terminalHeight - 20));

  useEffect(() => {
    setContexts(getContexts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingNamespaces(true);
    getNamespaces().then((ns) => {
      if (!cancelled) {
        setNamespaces(ns);
        setLoadingNamespaces(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedContext]);

  // Keep dropdown selection visible
  useEffect(() => {
    if (dropdownIndex < dropdownScroll) {
      setDropdownScroll(dropdownIndex);
    } else if (dropdownIndex >= dropdownScroll + maxDropdownHeight) {
      setDropdownScroll(dropdownIndex - maxDropdownHeight + 1);
    }
  }, [dropdownIndex, dropdownScroll, maxDropdownHeight]);

  function getDropdownItems(): string[] {
    if (activeField === 'context') return contexts;
    if (activeField === 'namespace') return namespaces;
    return themes.map((t) => t.name);
  }

  function openDropdown() {
    const items = getDropdownItems();
    if (items.length === 0) return;
    if (activeField === 'namespace' && loadingNamespaces) return;

    let currentIdx = 0;
    if (activeField === 'context') {
      currentIdx = items.indexOf(selectedContext);
    } else if (activeField === 'namespace') {
      currentIdx = items.indexOf(selectedNamespace);
    } else {
      currentIdx = themes.findIndex((t) => t.name === theme.name);
    }
    currentIdx = Math.max(0, currentIdx);

    setDropdownIndex(currentIdx);
    setDropdownScroll(Math.max(0, currentIdx - Math.floor(maxDropdownHeight / 2)));
    setDropdownOpen(true);
  }

  function selectItem(index: number) {
    const items = getDropdownItems();
    const selected = items[index];
    if (!selected) return;

    if (activeField === 'context') {
      setContext(selected);
      setSelectedContext(selected);
      setSelectedNamespace(getCurrentNamespace());
    } else if (activeField === 'namespace') {
      setSelectedNamespace(selected);
    } else {
      const t = themes.find((th) => th.name === selected);
      if (t) onThemeChange(t);
    }
  }

  function navigateField(direction: 1 | -1) {
    const idx = FIELDS.indexOf(activeField);
    const next = idx + direction;
    if (next >= 0 && next < FIELDS.length) {
      setActiveField(FIELDS[next]!);
    }
  }

  useKeyboard((key: KeyEvent) => {
    if (key.ctrl && (key.name === 'q' || key.name === 'c')) {
      onQuit();
      return;
    }

    // Dropdown open
    if (dropdownOpen) {
      const items = getDropdownItems();

      if (key.name === 'escape' || key.name === 'left') {
        setDropdownOpen(false);
        return;
      }

      if (key.name === 'j' || key.name === 'down') {
        setDropdownIndex((i) => Math.min(i + 1, items.length - 1));
        return;
      }
      if (key.name === 'k' || key.name === 'up') {
        setDropdownIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (key.name === 'pagedown' || (key.ctrl && key.name === 'f')) {
        setDropdownIndex((i) => Math.min(i + maxDropdownHeight, items.length - 1));
        return;
      }
      if (key.name === 'pageup' || (key.ctrl && key.name === 'b')) {
        setDropdownIndex((i) => Math.max(i - maxDropdownHeight, 0));
        return;
      }

      if (key.name === 'return' || key.name === 'right') {
        selectItem(dropdownIndex);
        setDropdownOpen(false);
        return;
      }
      return;
    }

    // Normal mode
    if (key.name === 'j' || key.name === 'down' || key.name === 'tab') {
      navigateField(1);
      return;
    }
    if (key.name === 'k' || key.name === 'up') {
      navigateField(-1);
      return;
    }

    if (key.name === 'return') {
      if (activeField === 'continue') {
        onEnter(selectedContext, selectedNamespace);
      } else {
        openDropdown();
      }
      return;
    }
  });

  function renderDropdown(forField: Field) {
    if (!dropdownOpen || activeField !== forField) return null;

    const items = getDropdownItems();
    const currentValue = forField === 'context'
      ? selectedContext
      : forField === 'namespace'
        ? selectedNamespace
        : theme.name;

    return (
      <box flexDirection="column" border borderStyle="single">
        {items.slice(dropdownScroll, dropdownScroll + maxDropdownHeight).map((item, i) => {
          const actualIndex = dropdownScroll + i;
          const isSelected = actualIndex === dropdownIndex;
          const isCurrent = item === currentValue;
          return (
            <box key={item} height={1} backgroundColor={isSelected ? theme.surface : undefined}>
              <text>
                <span fg={isSelected ? theme.text : isCurrent ? theme.success : theme.textSecondary}>
                  {isSelected ? '▸ ' : isCurrent ? '● ' : '  '}{item}
                </span>
              </text>
            </box>
          );
        })}
      </box>
    );
  }

  return (
    <box flexDirection="column" width="100%" height="100%" alignItems="center">
      {/* Top spacer */}
      <box height={Math.max(1, Math.floor((terminalHeight - 24) / 2))} />

      {/* Logo with helm */}
      <box flexDirection="column" alignItems="center">
        {LOGO.map((line, i) => (
          <box key={i} height={1} flexDirection="row">
            <text>
              <span fg={theme.textDim}>{HELM[i] ?? '             '}</span>
              <span fg={theme.accent}>{line}</span>
            </text>
          </box>
        ))}
      </box>

      <box height={1} />

      <box height={1} justifyContent="center">
        <text>
          <span fg={theme.textDim}>⎈  Kubernetes Pod File Explorer  ⎈</span>
        </text>
      </box>

      <box height={2} />

      {/* Connection section */}
      <box height={1}>
        <text>
          <span fg={theme.textDim}>─── Connection ───</span>
        </text>
      </box>

      <box height={1} />

      {/* Context field */}
      <box flexDirection="column" alignItems="center">
        <box height={1}>
          <text>
            <span fg={activeField === 'context' ? theme.text : theme.textDim}>
              {activeField === 'context' ? '▸ ' : '  '}
              Context:   </span>
            <span fg={activeField === 'context' ? theme.accent : theme.textSecondary}>
              {selectedContext}
            </span>
            {activeField === 'context' && !dropdownOpen && (
              <span fg={theme.textDim}> (Enter to change)</span>
            )}
          </text>
        </box>
        {renderDropdown('context')}
      </box>

      {/* Namespace field */}
      <box flexDirection="column" alignItems="center">
        <box height={1}>
          <text>
            <span fg={activeField === 'namespace' ? theme.text : theme.textDim}>
              {activeField === 'namespace' ? '▸ ' : '  '}
              Namespace: </span>
            <span fg={activeField === 'namespace' ? theme.accent : theme.textSecondary}>
              {loadingNamespaces ? 'loading...' : selectedNamespace}
            </span>
            {activeField === 'namespace' && !dropdownOpen && !loadingNamespaces && (
              <span fg={theme.textDim}> (Enter to change)</span>
            )}
          </text>
        </box>
        {renderDropdown('namespace')}
      </box>

      <box height={2} />

      {/* Configuration section */}
      <box height={1}>
        <text>
          <span fg={theme.textDim}>─── Configuration ───</span>
        </text>
      </box>

      <box height={1} />

      {/* Theme field */}
      <box flexDirection="column" alignItems="center">
        <box height={1}>
          <text>
            <span fg={activeField === 'theme' ? theme.text : theme.textDim}>
              {activeField === 'theme' ? '▸ ' : '  '}
              Theme:     </span>
            <span fg={activeField === 'theme' ? theme.accent : theme.textSecondary}>
              {theme.name}
            </span>
            {activeField === 'theme' && !dropdownOpen && (
              <span fg={theme.textDim}> (Enter to change)</span>
            )}
          </text>
        </box>
        {renderDropdown('theme')}
      </box>

      <box height={2} />

      {/* Continue button */}
      <box height={1} justifyContent="center">
        <text>
          {activeField === 'continue' ? (
            <span fg={theme.accent}>▸ [ Continue ] ◂</span>
          ) : (
            <span fg={theme.textDim}>  [ Continue ]  </span>
          )}
        </text>
      </box>

      <box flexGrow={1} />

      <box height={1} width="100%" backgroundColor={theme.statusBar}>
        <text>
          <span fg={theme.text}>
            {' '}j/k: switch field | Enter: select/continue | Esc: close | ^Q: quit{' '}
          </span>
        </text>
      </box>
    </box>
  );
}
