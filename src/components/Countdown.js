// Compute countdown values from a target date.
export function render(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);

  if (Number.isNaN(target.getTime())) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00d 00h 00m 00s'
    };
  }

  const diff = Math.max(0, target.getTime() - now.getTime());
  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds: remainingSeconds,
    formatted: `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`
  };
}

export function Countdown(targetDate) {
  return render(targetDate);
}
