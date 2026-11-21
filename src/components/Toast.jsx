import { Check, CircleAlert, Info, X } from 'lucide-react';

const noticeStyles = {
  success: { tone: 'green', icon: Check },
  error: { tone: 'red', icon: CircleAlert },
  info: { tone: 'blue', icon: Info },
};

export default function Toast({ message, type, onClose }) {
  const { tone, icon: Icon } = noticeStyles[type] || noticeStyles.info;

  return (
    <div className="workspace-notice ui-enter fixed right-3 bottom-20 left-3 z-[100] flex items-center gap-3 rounded-2xl py-2 pr-2 pl-4 sm:right-6 sm:left-auto" data-tone={tone} role={type === 'error' ? 'alert' : 'status'}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="workspace-icon-button" aria-label="Dismiss notification"><X className="size-4" aria-hidden="true" /></button>
    </div>
  );
}
