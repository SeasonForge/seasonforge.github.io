// Render and control a simple toast notification.
import { escapeHtml } from '../utils/helpers.js';

const TITLE_MAP = {
  info: 'Information',
  success: 'Success',
  error: 'Error',
  warning: 'Warning'
};

export function render(options = {}) {
  const message = escapeHtml(options.message || '');
  const type = escapeHtml(options.type || 'info');
  const isVisible = Boolean(options.isVisible);
  const icon = type === 'error' ? '✕' : '✓';

  if (!isVisible) {
    return '';
  }

  return `
    <div class="toast toast--${type}" role="status">
      <div class="toast__icon">${icon}</div>
      <div>
        <div class="toast__title">${TITLE_MAP[type] || 'Info'}</div>
        <div class="toast__message">${message}</div>
      </div>
    </div>
  `;
}

export function Toast(options = {}) {
  const state = {
    isVisible: Boolean(options.isVisible)
  };

  return {
    show() {
      state.isVisible = true;
      return this;
    },
    hide() {
      state.isVisible = false;
      return this;
    },
    render() {
      return render({ ...options, isVisible: state.isVisible });
    }
  };
}
