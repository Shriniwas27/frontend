export default function MetricCard({ title, value, icon: Icon, tone }) {
  return (
    <div className="ui-card-soft flex items-start justify-between gap-3 rounded-2xl p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-app-text-secondary">{title}</p>
        <p className="mt-2 text-3xl font-medium tracking-tight">{value}</p>
      </div>
      <span className="landing-feature-icon !mb-0" data-tone={tone}>
        <Icon aria-hidden="true" />
      </span>
    </div>
  );
}
