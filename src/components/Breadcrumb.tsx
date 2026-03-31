import { useTheme } from '../theme';

interface BreadcrumbProps {
  podName: string;
  containerName: string;
  path: string;
}

export function Breadcrumb({ podName, containerName, path }: BreadcrumbProps) {
  const theme = useTheme();
  return (
    <box height={1} width="100%">
      <text>
        <strong><span fg={theme.accent}>{podName}</span></strong>
        <span fg={theme.textDim}>:</span>
        <span fg={theme.textSecondary}>{containerName}</span>
        <span fg={theme.textDim}> @ </span>
        <span fg={theme.accent}>{path}</span>
      </text>
    </box>
  );
}
