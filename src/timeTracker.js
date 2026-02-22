export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatSeconds(seconds) {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export function buildCalendarDays(monthDate, tasks) {
  const start = new Date(monthDate);
  start.setDate(1);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = formatDateKey(day);
    return {
      key,
      date: day,
      currentMonth: day.getMonth() === monthDate.getMonth(),
      hasTasks: tasks.some((task) => task.dateKey === key)
    };
  });
}
