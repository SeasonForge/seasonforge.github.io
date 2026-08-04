// Render a status badge from a status value.
import { escapeHtml } from '../utils/helpers.js';

export function render(status) {
  const label = escapeHtml(typeof status === 'string' ? status : status?.label || status?.code || 'Unknown');
  const type = typeof status === 'string' ? 'default' : escapeHtml(status?.code || 'default');

  return `<span class="status-badge status-badge--${type}">${label}</span>`;
}

export function StatusBadge(status) {
  return render(status);
}
