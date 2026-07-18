// Render a status badge from a status value.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function render(status) {
  const label = escapeHtml(typeof status === 'string' ? status : status?.label || status?.code || 'Unknown');
  const type = typeof status === 'string' ? 'default' : escapeHtml(status?.code || 'default');

  return `<span class="status-badge status-badge--${type}">${label}</span>`;
}

export function StatusBadge(status) {
  return render(status);
}
