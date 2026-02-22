import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays,
  buildCalendarDays,
  buildTaskCountMap,
  buildWeekDays,
  formatDateKey,
  formatSeconds,
  getWeekStart,
  parseDateKey
} from '../src/timeTracker.js';

test('formatDateKey возвращает YYYY-MM-DD', () => {
  const date = new Date('2026-02-03T12:00:00');
  assert.equal(formatDateKey(date), '2026-02-03');
});

test('parseDateKey преобразует key в дату', () => {
  const parsed = parseDateKey('2026-02-03');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 1);
  assert.equal(parsed.getDate(), 3);
});

test('addDays корректно добавляет дни', () => {
  const date = new Date('2026-02-03T00:00:00');
  assert.equal(formatDateKey(addDays(date, 2)), '2026-02-05');
});

test('getWeekStart возвращает понедельник', () => {
  const sunday = new Date('2026-02-08T10:00:00');
  assert.equal(formatDateKey(getWeekStart(sunday)), '2026-02-02');
});

test('formatSeconds форматирует в HH:MM:SS', () => {
  assert.equal(formatSeconds(0), '00:00:00');
  assert.equal(formatSeconds(75), '00:01:15');
  assert.equal(formatSeconds(3661), '01:01:01');
});

test('buildTaskCountMap считает задачи по дням', () => {
  const map = buildTaskCountMap([
    { dateKey: '2026-02-01' },
    { dateKey: '2026-02-01' },
    { dateKey: '2026-02-02' }
  ]);

  assert.equal(map['2026-02-01'], 2);
  assert.equal(map['2026-02-02'], 1);
});

test('buildCalendarDays возвращает taskCount и 42 ячейки', () => {
  const monthDate = new Date('2026-02-01T00:00:00');
  const tasks = [{ id: 1, dateKey: '2026-02-10' }, { id: 2, dateKey: '2026-02-10' }];

  const days = buildCalendarDays(monthDate, tasks);
  const target = days.find((day) => day.key === '2026-02-10');

  assert.equal(days.length, 42);
  assert.equal(target?.hasTasks, true);
  assert.equal(target?.taskCount, 2);
});

test('buildWeekDays возвращает 7 дней выбранной недели', () => {
  const anchor = new Date('2026-02-11T00:00:00');
  const tasks = [{ dateKey: '2026-02-10' }];

  const week = buildWeekDays(anchor, tasks);

  assert.equal(week.length, 7);
  assert.equal(week[0].key, '2026-02-09');
  assert.equal(week[1].taskCount, 1);
});
