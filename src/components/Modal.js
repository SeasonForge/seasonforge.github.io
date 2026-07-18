// Render and control a simple modal component.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function render(options = {}) {
  const title = escapeHtml(options.title || 'Modal');
  const content = escapeHtml(options.content || '');
  const isOpen = Boolean(options.isOpen);

  if (!isOpen) {
    return '<div class="modal modal--hidden"></div>';
  }

  return `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <button class="modal__close" type="button">×</button>
        <h3 class="modal__title">${title}</h3>
        <div class="modal__body">${content}</div>
      </div>
    </div>
  `;
}

export function Modal(options = {}) {
  const state = {
    isOpen: Boolean(options.isOpen)
  };

  return {
    open() {
      state.isOpen = true;
      return this;
    },
    close() {
      state.isOpen = false;
      return this;
    },
    render() {
      return render({ ...options, isOpen: state.isOpen });
    }
  };
}
