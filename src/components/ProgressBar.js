// Render a progress bar from a percentage value and dynamic color.
export function render(percent = 0, color = '') {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const roundedPercent = Math.round(safePercent);
  
  // Apply the game's theme color to background and soft glow shadows
  const colorStyle = color 
    ? `background: ${color}; box-shadow: 0 0 8px color-mix(in srgb, ${color} 40%, transparent);` 
    : '';

  return `
    <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${roundedPercent}">
      <div class="progress-bar__label">${roundedPercent}%</div>
      <div class="progress-bar__track">
        <div class="progress-bar__fill" style="width: ${roundedPercent}%; ${colorStyle}"></div>
      </div>
    </div>
  `;
}

export function ProgressBar(percent, color) {
  return render(percent, color);
}
