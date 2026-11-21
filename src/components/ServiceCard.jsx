import { ExternalLink, GitBranch, Globe, Settings2, Trash2 } from 'lucide-react';

export default function ServiceCard({
  microserviceName, gcpProject, status, agentName, agentId, repoUrl, githubRepo, deployedUrl, latency, onAction,
}) {
  const tone = status === 'Operational' ? 'green' : status === 'Degraded' ? 'yellow' : 'red';
  const isDown = status === 'Down';
  const displayServiceName = typeof microserviceName === 'string'
    ? microserviceName.split('/services/').pop()
    : microserviceName;
  const linkedRepoUrl = repoUrl || githubRepo?.repo_url;
  const repoDisplayName = githubRepo?.repo || linkedRepoUrl?.replace('https://github.com/', '');
  const parsedLatency = Number.parseInt(latency, 10) || 0;
  const meterWidth = isDown ? 100 : Math.min(100, Math.max(20, (200 - parsedLatency) / 2));

  return (
    <article className="ui-card-soft ui-card-soft-hover flex h-full min-w-0 flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="landing-feature-icon !mb-0" data-tone="blue"><Globe aria-hidden="true" /></span>
        <span className="preview-badge" data-tone={tone}>{status}</span>
      </div>

      <div className="min-w-0">
        <h3 className="break-words text-lg font-medium">{displayServiceName}</h3>
        <p className="break-words text-sm text-app-text-secondary">{gcpProject || 'No project'} · {agentName}</p>
        <p className="mt-1 break-all font-mono text-xs text-app-text-secondary">{agentId}</p>
      </div>

      {(linkedRepoUrl || deployedUrl) && (
        <div className="flex flex-wrap gap-2">
          {linkedRepoUrl && (
            <a href={linkedRepoUrl} target="_blank" rel="noopener noreferrer" className="preview-badge inline-flex max-w-full items-center gap-1 hover:underline" data-tone="blue" title="View GitHub repository">
              <GitBranch className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{repoDisplayName}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          )}
          {deployedUrl && (
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="preview-badge inline-flex items-center gap-1 hover:underline" data-tone="green" title="Open deployed Cloud Run service">
              Live app <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <div className="mt-auto space-y-2">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-app-text-secondary">Latency</span>
          <span>{isDown ? '∞' : latency}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-app-border" aria-hidden="true">
          <div className="h-full rounded-full bg-[var(--tone-foreground)] transition-[width]" data-tone={tone} style={{ width: `${meterWidth}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-app-border pt-3">
        {deployedUrl && (
          <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="workspace-filter inline-flex items-center gap-1.5 px-3" title="Open deployed Cloud Run service">
            <ExternalLink className="size-3.5" aria-hidden="true" /> Visit app
          </a>
        )}
        <button onClick={() => onAction('Configure')} className="workspace-filter inline-flex flex-1 items-center justify-center gap-1.5 px-3">
          <Settings2 className="size-4 shrink-0" aria-hidden="true" /> View details
        </button>
        <button onClick={() => onAction('Delete')} className="workspace-icon-button hover:!text-rose-accent" title="Delete service" aria-label="Delete service">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
