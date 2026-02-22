<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  addDays,
  buildCalendarDays,
  buildWeekDays,
  formatDateKey,
  formatSeconds,
  getWeekStart,
  parseDateKey
} from './timeTracker';

const today = new Date();
const monthCursor = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const selectedDateKey = ref(formatDateKey(today));
const viewMode = ref('month');
const draggingTaskId = ref(null);
const dropHoverKey = ref(null);
const nextTaskId = ref(5);
const editingTaskId = ref(null);
const editingTaskDraft = ref({ title: '', description: '', project: '', estimate: 25, dateKey: formatDateKey(today) });

const tasks = ref([
  { id: 1, title: 'Дизайн onboarding flow', description: 'Собрать финальный прототип и передать в разработку.', project: 'Product', estimate: 45, done: false, dateKey: formatDateKey(today), elapsed: 0 },
  { id: 2, title: 'Daily standup', description: 'Обновить команду по статусам и рискам.', project: 'Team', estimate: 15, done: false, dateKey: formatDateKey(today), elapsed: 0 },
  { id: 3, title: 'Refactor API service', description: 'Почистить дубли и вынести общие модули.', project: 'Engineering', estimate: 60, done: false, dateKey: formatDateKey(addDays(today, 1)), elapsed: 0 },
  { id: 4, title: 'Аналитика за неделю', description: 'Собрать метрики и короткие выводы по спринту.', project: 'Ops', estimate: 35, done: false, dateKey: formatDateKey(addDays(today, 2)), elapsed: 0 }
]);

const newTask = ref({ title: '', description: '', project: '', estimate: 25 });
const activeTaskId = ref(null);
let ticker = null;

const periodLabel = computed(() => {
  if (viewMode.value === 'month') {
    return monthCursor.value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  const start = getWeekStart(parseDateKey(selectedDateKey.value));
  const end = addDays(start, 6);
  return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
});

const visibleDays = computed(() => {
  if (viewMode.value === 'week') {
    return buildWeekDays(parseDateKey(selectedDateKey.value), tasks.value);
  }

  return buildCalendarDays(monthCursor.value, tasks.value);
});

const selectedDateLabel = computed(() =>
  parseDateKey(selectedDateKey.value).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
);

const plannedTasks = computed(() => tasks.value.filter((task) => task.dateKey === selectedDateKey.value));
const activeTask = computed(() => tasks.value.find((task) => task.id === activeTaskId.value) || null);
const totalTrackedSeconds = computed(() => tasks.value.reduce((sum, task) => sum + task.elapsed, 0));

function addTask() {
  if (!newTask.value.title.trim()) return;

  tasks.value.push({
    id: nextTaskId.value++,
    title: newTask.value.title.trim(),
    description: newTask.value.description.trim(),
    project: newTask.value.project.trim() || 'General',
    estimate: Number(newTask.value.estimate) || 25,
    done: false,
    dateKey: selectedDateKey.value,
    elapsed: 0
  });

  newTask.value = { title: '', description: '', project: '', estimate: 25 };
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
    if (task) task.elapsed += 1;
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
  if (activeTaskId.value === taskId) stopTimer();
  if (editingTaskId.value === taskId) cancelEdit();
  tasks.value = tasks.value.filter((task) => task.id !== taskId);
}

function setPeriod(direction) {
  if (viewMode.value === 'week') {
    const next = addDays(parseDateKey(selectedDateKey.value), direction * 7);
    selectedDateKey.value = formatDateKey(next);
    monthCursor.value = new Date(next.getFullYear(), next.getMonth(), 1);
    return;
  }

  const next = new Date(monthCursor.value);
  next.setMonth(next.getMonth() + direction);
  monthCursor.value = next;
}

function setViewMode(mode) {
  viewMode.value = mode;
}

function selectDay(dayKey) {
  selectedDateKey.value = dayKey;
  monthCursor.value = new Date(parseDateKey(dayKey).getFullYear(), parseDateKey(dayKey).getMonth(), 1);
}

function startEdit(task) {
  editingTaskId.value = task.id;
  editingTaskDraft.value = {
    title: task.title,
    description: task.description,
    project: task.project,
    estimate: task.estimate,
    dateKey: task.dateKey
  };
}

function saveEdit() {
  const task = tasks.value.find((item) => item.id === editingTaskId.value);
  if (!task) return;

  task.title = editingTaskDraft.value.title.trim() || task.title;
  task.description = editingTaskDraft.value.description.trim();
  task.project = editingTaskDraft.value.project.trim() || 'General';
  task.estimate = Number(editingTaskDraft.value.estimate) || 25;
  task.dateKey = editingTaskDraft.value.dateKey;

  editingTaskId.value = null;
}

function cancelEdit() {
  editingTaskId.value = null;
}

function onDragStart(taskId) {
  draggingTaskId.value = taskId;
}

function onDragOver(dayKey) {
  dropHoverKey.value = dayKey;
  const task = tasks.value.find((item) => item.id === draggingTaskId.value);
  if (task && task.dateKey !== dayKey) {
    task.dateKey = dayKey;
  }
}

function onDrop() {
  draggingTaskId.value = null;
  dropHoverKey.value = null;
}

function onDragEnd() {
  draggingTaskId.value = null;
  dropHoverKey.value = null;
}

onBeforeUnmount(() => stopTimer());

const trackerTitle = computed(() => activeTask.value?.title || 'Таймер не запущен');
const trackerDescription = computed(
  () => activeTask.value?.description || 'Выберите задачу и нажмите «Старт», чтобы начать мониторинг.'
);
const trackerElapsed = computed(() => formatSeconds(activeTask.value?.elapsed || 0));
</script>

<template>
  <div class="app-shell">
    <header class="hero glass-card">
      <div>
        <h1>Vibe Time Tracker</h1>
        <p>Календарь + задачи + таймер. Режим месяца и недели.</p>
      </div>
      <div class="stats">
        <div>
          <span>Задач на день</span>
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
            <button type="button" @click="setPeriod(-1)">‹</button>
            <strong>{{ periodLabel }}</strong>
            <button type="button" @click="setPeriod(1)">›</button>
          </div>
        </div>

        <div class="view-toggle">
          <button type="button" :class="{ active: viewMode === 'month' }" @click="setViewMode('month')">Месяц</button>
          <button type="button" :class="{ active: viewMode === 'week' }" @click="setViewMode('week')">Неделя</button>
        </div>

        <div class="weekdays" :class="{ week: viewMode === 'week' }">
          <span v-for="weekday in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="calendar-grid" :class="{ week: viewMode === 'week' }">
          <button
            v-for="day in visibleDays"
            :key="day.key"
            class="day-cell"
            :class="{
              muted: viewMode === 'month' && !day.currentMonth,
              selected: selectedDateKey === day.key,
              marked: day.hasTasks,
              dropzone: dropHoverKey === day.key
            }"
            @click="selectDay(day.key)"
            @dragover.prevent="onDragOver(day.key)"
            @drop.prevent="onDrop"
          >
            <span class="day-number">{{ day.date.getDate() }}</span>
            <span v-if="day.taskCount" class="task-count">{{ day.taskCount }}</span>
          </button>
        </div>
      </section>

      <section class="glass-card planner-panel">
        <div class="panel-header">
          <h2>План на {{ selectedDateLabel }}</h2>
        </div>

        <form class="task-form" @submit.prevent="addTask">
          <input v-model="newTask.title" type="text" placeholder="Что нужно сделать?" />
          <input v-model="newTask.description" type="text" placeholder="Описание задачи" />
          <input v-model="newTask.project" type="text" placeholder="Проект" />
          <input v-model.number="newTask.estimate" type="number" min="5" step="5" />
          <button type="submit">Добавить</button>
        </form>

        <article class="timer-hero" :class="{ idle: !activeTask }">
          <p class="timer-hero-label">Реактивный таймер задачи</p>
          <h3>{{ trackerTitle }}</h3>
          <p>{{ trackerDescription }}</p>
          <strong>{{ trackerElapsed }}</strong>
        </article>

        <ul class="task-list">
          <li
            v-for="task in plannedTasks"
            :key="task.id"
            draggable="true"
            class="task-item"
            :class="{ running: activeTask?.id === task.id, editing: editingTaskId === task.id }"
            @dragstart="onDragStart(task.id)"
            @dragend="onDragEnd"
          >
            <template v-if="editingTaskId === task.id">
              <div class="edit-form">
                <input v-model="editingTaskDraft.title" type="text" placeholder="Название" />
                <input v-model="editingTaskDraft.description" type="text" placeholder="Описание" />
                <input v-model="editingTaskDraft.project" type="text" placeholder="Проект" />
                <input v-model.number="editingTaskDraft.estimate" type="number" min="5" step="5" />
                <input v-model="editingTaskDraft.dateKey" type="date" />
              </div>
              <div class="task-actions">
                <button type="button" @click="saveEdit">Сохранить</button>
                <button type="button" class="ghost" @click="cancelEdit">Отмена</button>
              </div>
            </template>

            <template v-else>
              <div class="task-main">
                <input :checked="task.done" type="checkbox" @change="toggleTask(task.id)" />
                <div>
                  <h3 :class="{ done: task.done }">{{ task.title }}</h3>
                  <p class="description" v-if="task.description">{{ task.description }}</p>
                  <p>{{ task.project }} · {{ task.estimate }} мин</p>
                </div>
              </div>
              <div class="task-actions">
                <span>{{ formatSeconds(task.elapsed) }}</span>
                <button type="button" v-if="activeTask?.id !== task.id" @click="startTimer(task.id)">Start</button>
                <button type="button" v-else class="danger" @click="stopTimer">Stop</button>
                <button type="button" class="ghost" @click="startEdit(task)">Edit</button>
                <button type="button" class="ghost" @click="deleteTask(task.id)">✕</button>
              </div>
            </template>
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
.app-shell { max-width: 1200px; margin: 0 auto; padding: clamp(1rem, 2vw, 2rem); display: grid; gap: 1rem; }
.glass-card { backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 24px; box-shadow: 0 20px 45px rgba(33, 50, 86, 0.1); }
.hero { padding: 1.25rem; display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.hero h1 { margin: 0; font-size: clamp(1.3rem, 4vw, 2rem); }
.hero p { margin: .35rem 0 0; color: #53607a; }
.stats { display: flex; gap: .75rem; }
.stats > div { background: rgba(255,255,255,.7); border-radius: 14px; padding: .75rem 1rem; min-width: 120px; display: grid; }
.layout { display: grid; gap: 1rem; grid-template-columns: minmax(290px, 380px) 1fr; }
.calendar-panel, .planner-panel { padding: 1rem; }
.panel-header { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.panel-header h2 { margin: 0; font-size: 1.05rem; }
.month-switch { display: flex; align-items: center; gap: .6rem; }
.month-switch button, .view-toggle button { border: none; border-radius: 999px; padding: .4rem .75rem; cursor: pointer; background: rgba(79, 113, 255, 0.12); }
.view-toggle { display: inline-flex; gap: .4rem; margin: .8rem 0 .4rem; background: rgba(255,255,255,.65); padding: .25rem; border-radius: 999px; }
.view-toggle .active { background: #3f6fff; color: #fff; }
.weekdays, .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: .4rem; }
.weekdays { margin: .5rem 0; color: #7883a0; font-size: .85rem; text-align: center; }
.calendar-grid.week { grid-template-columns: repeat(7, minmax(0,1fr)); }
.day-cell { border: none; background: rgba(255,255,255,.8); border-radius: 14px; min-height: 60px; cursor: pointer; position: relative; display: flex; align-items: flex-start; justify-content: space-between; padding: .45rem; transition: transform .12s ease, box-shadow .12s ease; }
.day-cell:hover { transform: translateY(-1px); box-shadow: 0 4px 18px rgba(62, 92, 186, .22); }
.day-cell .day-number { font-weight: 600; }
.day-cell .task-count { background: #3f6fff; color: #fff; min-width: 20px; height: 20px; padding: 0 .35rem; border-radius: 999px; font-size: .74rem; line-height: 20px; text-align: center; }
.day-cell.selected { background: linear-gradient(145deg, #3f6fff, #6f91ff); color: #fff; }
.day-cell.selected .task-count { background: rgba(255,255,255,.24); }
.day-cell.muted { color: #a9b2ca; background: rgba(255,255,255,.4); }
.day-cell.dropzone { outline: 2px dashed #3f6fff; transform: scale(1.03); }
.task-form { margin-top: .8rem; display: grid; gap: .5rem; grid-template-columns: 1.3fr 1.3fr 1fr 96px auto; }
.task-form input, .task-form button, .task-actions button, .edit-form input { border: none; border-radius: 12px; padding: .55rem .75rem; font: inherit; }
.task-form input, .edit-form input { background: rgba(255,255,255,.92); }
.task-form button, .task-actions button { background: #3f6fff; color: #fff; cursor: pointer; }
.timer-hero {
  margin-top: .8rem;
  padding: 1rem;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(63, 111, 255, 0.18), rgba(123, 150, 255, 0.25));
  border: 1px solid rgba(63, 111, 255, 0.3);
  display: grid;
  gap: .35rem;
}
.timer-hero.idle {
  background: rgba(255,255,255,.75);
  border-color: rgba(110, 124, 162, 0.22);
}
.timer-hero-label { margin: 0; font-size: .74rem; text-transform: uppercase; letter-spacing: .08em; color: #4d5d86; }
.timer-hero h3 { margin: 0; font-size: 1.05rem; }
.timer-hero p { margin: 0; color: #5a6787; }
.timer-hero strong {
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1;
  letter-spacing: .06em;
  font-variant-numeric: tabular-nums;
}
.task-list { list-style: none; padding: 0; margin: .8rem 0 0; display: grid; gap: .6rem; }
.task-item { display: flex; justify-content: space-between; gap: .75rem; align-items: center; background: rgba(255,255,255,.82); border-radius: 16px; padding: .75rem; }
.task-item.running { outline: 2px solid rgba(58,108,255,.5); }
.task-item.editing { background: rgba(237, 242, 255, 0.95); }
.task-main { display: flex; gap: .6rem; align-items: center; }
.task-main h3 { margin: 0; font-size: .95rem; }
.task-main h3.done { text-decoration: line-through; color: #8d97ad; }
.task-main p { margin: .1rem 0 0; color: #64708c; font-size: .85rem; }
.task-main .description { color: #414f70; font-size: .83rem; max-width: 56ch; }
.edit-form { flex: 1; display: grid; grid-template-columns: 1.3fr 1.3fr 1fr 90px 150px; gap: .45rem; }
.task-actions { display: flex; align-items: center; gap: .5rem; }
.task-actions span { color: #5f6d87; font-variant-numeric: tabular-nums; min-width: 76px; }
.task-actions .danger { background: #d63f5f; }
.task-actions .ghost { background: rgba(17, 25, 40, 0.1); color: #17203a; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } .edit-form { grid-template-columns: 1fr 1fr; } }
@media (max-width: 720px) {
  .hero, .stats, .task-item, .task-actions { flex-direction: column; align-items: flex-start; }
  .task-form, .edit-form { grid-template-columns: 1fr; }
  .task-actions { width: 100%; }
  .task-actions button { width: 100%; }
}
</style>
