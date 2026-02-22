import test from 'node:test';
import assert from 'node:assert/strict';

import { addDays, buildCalendarDays, formatDateKey, formatSeconds } from '../src/timeTracker.js';

test('formatDateKey возвращает YYYY-MM-DD', () => {
  const date = new Date('2026-02-03T12:00:00');
  assert.equal(formatDateKey(date), '2026-02-03');
});

test('addDays корректно добавляет дни', () => {
  const date = new Date('2026-02-03T00:00:00');
  assert.equal(formatDateKey(addDays(date, 2)), '2026-02-05');
});

test('formatSeconds форматирует в HH:MM:SS', () => {
  assert.equal(formatSeconds(0), '00:00:00');
  assert.equal(formatSeconds(75), '00:01:15');
  assert.equal(formatSeconds(3661), '01:01:01');
});

test('buildCalendarDays всегда возвращает 42 дня и метки задач', () => {
  const monthDate = new Date('2026-02-01T00:00:00');
  const tasks = [{ id: 1, dateKey: '2026-02-10' }];

  const days = buildCalendarDays(monthDate, tasks);

  assert.equal(days.length, 42);
  assert.equal(days.some((day) => day.key === '2026-02-10' && day.hasTasks), true);
  assert.equal(days.filter((day) => day.currentMonth).length >= 28, true);
});
