<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { addDays, buildCalendarDays, formatDateKey, formatSeconds } from './timeTracker';

const today = new Date();
const monthCursor = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const selectedDateKey = ref(formatDateKey(today));
const draggingTaskId = ref(null);
const nextTaskId = ref(5);

const tasks = ref([
  {
    id: 1,
    title: 'Дизайн onboarding flow',
    project: 'Product',
    estimate: 45,
    done: false,
    dateKey: formatDateKey(today),
    elapsed: 0
  },
  {
    id: 2,
    title: 'Daily standup',
    project: 'Team',
    estimate: 15,
    done: false,
    dateKey: formatDateKey(today),
    elapsed: 0
  },
  {
    id: 3,
    title: 'Refactor API service',
    project: 'Engineering',
    estimate: 60,
    done: false,
    dateKey: formatDateKey(addDays(today, 1)),
    elapsed: 0
  },
  {
    id: 4,
    title: 'Аналитика за неделю',
    project: 'Ops',
    estimate: 35,
    done: false,
    dateKey: formatDateKey(addDays(today, 2)),
    elapsed: 0
  }
]);

const newTask = ref({ title: '', project: '', estimate: 25 });
const activeTaskId = ref(null);
let ticker = null;

const monthLabel = computed(() =>
  monthCursor.value.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  })
);

const calendarDays = computed(() => buildCalendarDays(monthCursor.value, tasks.value));

const selectedDateLabel = computed(() =>
  new Date(`${selectedDateKey.value}T00:00:00`).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
);

const plannedTasks = computed(() =>
  tasks.value.filter((task) => task.dateKey === selectedDateKey.value)
);

const activeTask = computed(() => tasks.value.find((task) => task.id === activeTaskId.value) || null);

const totalTrackedSeconds = computed(() => tasks.value.reduce((sum, task) => sum + task.elapsed, 0));

function addTask() {
  if (!newTask.value.title.trim()) return;

  tasks.value.push({
    id: nextTaskId.value++,
    title: newTask.value.title.trim(),
    project: newTask.value.project.trim() || 'General',
    estimate: Number(newTask.value.estimate) || 25,
    done: false,
    dateKey: selectedDateKey.value,
    elapsed: 0
  });

  newTask.value = { title: '', project: '', estimate: 25 };
}

function toggleTask(taskId) {
  const task = tasks.value.find((item) => item.id === taskId);
  if (!task) return;
  task.done = !task.done;
}

function startTimer(taskId) {
  if (activeTaskId.value === taskId) return;

  stopTimer();
  activeTaskId.value = taskId;
  ticker = setInterval(() => {
    const task = tasks.value.find((item) => item.id === activeTaskId.value);
    if (!task) return;
    task.elapsed += 1;
  }, 1000);
}

function stopTimer() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
  activeTaskId.value = null;
}

function deleteTask(taskId) {
  if (activeTaskId.value === taskId) {
    stopTimer();
  }
  tasks.value = tasks.value.filter((task) => task.id !== taskId);
}

function setMonth(direction) {
  const next = new Date(monthCursor.value);
  next.setMonth(next.getMonth() + direction);
  monthCursor.value = next;
}


function onDragStart(taskId) {
  draggingTaskId.value = taskId;
}

function onDrop(dayKey) {
  const task = tasks.value.find((item) => item.id === draggingTaskId.value);
  if (task) {
    task.dateKey = dayKey;
  }
  draggingTaskId.value = null;
}



onBeforeUnmount(() => stopTimer());
</script>

<template>
  <div class="app-shell">
    <header class="hero glass-card">
      <div>
        <h1>Vibe Time Tracker</h1>
        <p>Минималистичный трекер задач и времени в стиле Apple + Toggl.</p>
      </div>
      <div class="stats">
        <div>
          <span>Сегодня задач</span>
          <strong>{{ plannedTasks.length }}</strong>
        </div>
        <div>
          <span>Всего времени</span>
          <strong>{{ formatSeconds(totalTrackedSeconds) }}</strong>
        </div>
      </div>
    </header>

    <main class="layout">
      <section class="glass-card calendar-panel">
        <div class="panel-header">
          <h2>Календарь</h2>
          <div class="month-switch">
            <button @click="setMonth(-1)">‹</button>
            <strong>{{ monthLabel }}</strong>
            <button @click="setMonth(1)">›</button>
          </div>
        </div>

        <div class="weekdays">
          <span v-for="weekday in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="calendar-grid">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            class="day-cell"
            :class="{
              muted: !day.currentMonth,
              selected: selectedDateKey === day.key,
              marked: day.hasTasks
            }"
            @click="selectedDateKey = day.key"
            @dragover.prevent
            @drop="onDrop(day.key)"
          >
            <span>{{ day.date.getDate() }}</span>
          </button>
        </div>
      </section>

      <section class="glass-card planner-panel">
        <div class="panel-header">
          <h2>План на {{ selectedDateLabel }}</h2>
        </div>

        <form class="task-form" @submit.prevent="addTask">
          <input v-model="newTask.title" type="text" placeholder="Что нужно сделать?" />
          <input v-model="newTask.project" type="text" placeholder="Проект" />
          <input v-model.number="newTask.estimate" type="number" min="5" step="5" />
          <button type="submit">Добавить</button>
        </form>

        <ul class="task-list">
          <li
            v-for="task in plannedTasks"
            :key="task.id"
            draggable="true"
            class="task-item"
            :class="{ running: activeTask?.id === task.id }"
            @dragstart="onDragStart(task.id)"
          >
            <div class="task-main">
              <input :checked="task.done" type="checkbox" @change="toggleTask(task.id)" />
              <div>
                <h3 :class="{ done: task.done }">{{ task.title }}</h3>
                <p>{{ task.project }} · {{ task.estimate }} мин</p>
              </div>
            </div>
            <div class="task-actions">
              <span>{{ formatSeconds(task.elapsed) }}</span>
              <button type="button" v-if="activeTask?.id !== task.id" @click="startTimer(task.id)">Start</button>
              <button type="button" v-else class="danger" @click="stopTimer">Stop</button>
              <button type="button" class="ghost" @click="deleteTask(task.id)">✕</button>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  color: #101623;
  background: radial-gradient(circle at 20% 20%, #dee7ff 0%, #f8f9ff 35%, #eef2f9 100%);
}

.app-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(1rem, 2vw, 2rem);
  display: grid;
  gap: 1rem;
}

.glass-card {
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  box-shadow: 0 20px 45px rgba(33, 50, 86, 0.1);
}

.hero {
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.hero h1 { margin: 0; font-size: clamp(1.3rem, 4vw, 2rem); }
.hero p { margin: 0.35rem 0 0; color: #53607a; }

.stats {
  display: flex;
  gap: 0.75rem;
}

.stats > div {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  padding: 0.75rem 1rem;
  min-width: 120px;
  display: grid;
}

.stats span { color: #6a7792; font-size: 0.8rem; }
.stats strong { font-size: 1rem; margin-top: 0.25rem; }

.layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(290px, 360px) 1fr;
}

.calendar-panel,
.planner-panel {
  padding: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.05rem;
}

.month-switch {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.month-switch button {
  border: none;
  border-radius: 999px;
  width: 30px;
  height: 30px;
  font-size: 1.2rem;
  cursor: pointer;
  background: rgba(79, 113, 255, 0.12);
}

.weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
}

.weekdays {
  margin: 1rem 0 0.5rem;
  color: #7883a0;
  font-size: 0.85rem;
  text-align: center;
}

.day-cell {
  border: none;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  min-height: 42px;
  cursor: pointer;
  position: relative;
}

.day-cell.marked::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3f6fff;
  bottom: 8px;
  right: 8px;
}

.day-cell.selected {
  background: linear-gradient(145deg, #3f6fff, #6f91ff);
  color: #fff;
}

.day-cell.muted {
  color: #a9b2ca;
  background: rgba(255, 255, 255, 0.4);
}

.task-form {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1.4fr 1fr 96px auto;
}

.task-form input,
.task-form button,
.task-actions button {
  border: none;
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  font: inherit;
}

.task-form input {
  background: rgba(255, 255, 255, 0.92);
}

.task-form button,
.task-actions button {
  background: #3f6fff;
  color: #fff;
  cursor: pointer;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0.8rem 0 0;
  display: grid;
  gap: 0.6rem;
}

.task-item {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 16px;
  padding: 0.75rem;
}

.task-item.running {
  outline: 2px solid rgba(58, 108, 255, 0.5);
}

.task-main {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.task-main h3 {
  margin: 0;
  font-size: 0.95rem;
}

.task-main h3.done {
  text-decoration: line-through;
  color: #8d97ad;
}

.task-main p {
  margin: 0.1rem 0 0;
  color: #64708c;
  font-size: 0.85rem;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-actions span {
  color: #5f6d87;
  font-variant-numeric: tabular-nums;
  min-width: 76px;
}

.task-actions .danger { background: #d63f5f; }
.task-actions .ghost { background: rgba(17, 25, 40, 0.1); color: #17203a; }

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero,
  .stats,
  .task-item,
  .task-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-form {
    grid-template-columns: 1fr;
  }

  .task-actions {
    width: 100%;
  }

  .task-actions button {
    width: 100%;
  }
}
</style>
