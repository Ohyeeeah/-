import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  CaretDown,
  Check,
  ClockCounterClockwise,
  DownloadSimple,
  MoonStars,
  Palette,
  Plus,
  Sun,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react'

type Tone = 'sky' | 'cream' | 'leaf' | 'coral'

type Task = {
  id: string
  date: string
  time: string
  title: string
  note?: string
  done: boolean
  tone: Tone
  rolled?: boolean
}

const STORAGE_KEY = 'peigens-day:v1'
const NOTES_KEY = 'peigens-notes:v1'
const tones: Tone[] = ['sky', 'cream', 'leaf', 'coral']

const speedLineColors = ['#42d9df', '#42d9df', '#91fff2', '#dffff8', '#b7c94e', '#f2c85c']

const speedLines = (() => {
  let seed = 0x6d2b79f5
  const random = () => {
    seed = Math.imul(seed ^ (seed >>> 15), seed | 1)
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61)
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
  }

  return Array.from({ length: 76 }, (_, index) => {
    const zone = random()
    let x: number
    let y: number
    if (zone < .78) {
      x = random() < .5 ? 18 + random() * 410 : 1012 + random() * 410
      y = 90 + Math.pow(random(), .72) * 790
    } else if (zone < .95) {
      x = 330 + random() * 780
      y = random() < .42 ? 48 + random() * 145 : 732 + random() * 150
    } else {
      x = 555 + random() * 330
      y = 225 + random() * 410
    }

    const vectorX = x - 720
    const vectorY = y - 410
    const distance = Math.max(Math.hypot(vectorX, vectorY), 1)
    const directionX = vectorX / distance
    const directionY = vectorY / distance
    const length = 7 + Math.pow(random(), 1.7) * 92
    const travel = 7 + random() * 24
    const duration = 9 + random() * 17

    return {
      id: index,
      x1: x - directionX * length * .22,
      y1: y - directionY * length * .22,
      x2: x + directionX * length * .78,
      y2: y + directionY * length * .78,
      color: speedLineColors[Math.floor(random() * speedLineColors.length)],
      opacity: .055 + Math.pow(random(), 1.45) * .205,
      width: .45 + random() * 1.55,
      duration,
      delay: -random() * duration,
      travelX: directionX * travel,
      travelY: directionY * travel,
    }
  })
})()

function NightSpeedLines({ className = 'night-speedlines' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <ellipse className="speed-haze" cx="720" cy="430" rx="460" ry="160" />
      <g className="random-speed-lines">
        {speedLines.map((line) => (
          <line
            className="random-speed-line"
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            style={{
              '--line-color': line.color,
              '--line-opacity': line.opacity,
              '--line-width': `${line.width}px`,
              '--line-duration': `${line.duration}s`,
              '--line-delay': `${line.delay}s`,
              '--travel-x': `${line.travelX}px`,
              '--travel-y': `${line.travelY}px`,
            } as React.CSSProperties}
          />
        ))}
      </g>
      <g className="night-stars">
        <circle cx="106" cy="132" r="1.4" /><circle cx="254" cy="248" r="1" /><circle cx="384" cy="92" r="1.5" />
        <circle cx="548" cy="178" r=".9" /><circle cx="688" cy="86" r="1.3" /><circle cx="772" cy="146" r=".8" />
        <circle cx="914" cy="74" r="1.5" /><circle cx="1092" cy="220" r="1" /><circle cx="1284" cy="112" r="1.4" />
        <circle cx="1348" cy="292" r=".8" /><circle cx="182" cy="382" r=".9" /><circle cx="1184" cy="368" r="1.2" />
      </g>
    </svg>
  )
}

const toKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const offsetDate = (key: string, amount: number) => {
  const date = fromKey(key)
  date.setDate(date.getDate() + amount)
  return toKey(date)
}

const todayKey = () => toKey(new Date())

const seedTasks = (): Task[] => [
  { id: crypto.randomUUID(), date: todayKey(), time: '08:30', title: '起床喝水，点亮今日状态', note: '第一格能量到手，开局！', done: false, tone: 'sky' },
  { id: crypto.randomUUID(), date: todayKey(), time: '10:00', title: '拿下今天最重要的一件事', note: '先攻 25 分钟，势头就来了。', done: false, tone: 'coral' },
  { id: crypto.randomUUID(), date: todayKey(), time: '14:30', title: '为开学后的自己准备一点东西', done: false, tone: 'leaf' },
  { id: crypto.randomUUID(), date: todayKey(), time: '20:30', title: '漂亮收尾，放心休息', note: '今天有战绩，明天继续升级。', done: false, tone: 'cream' },
]

const migrateStarterCopy = (tasks: Task[]): Task[] => tasks.map((task) => {
  if (task.title === '慢慢醒来，喝一杯水' && task.note === '不用冲刺，先让身体上线。') {
    return { ...task, title: '起床喝水，点亮今日状态', note: '第一格能量到手，开局！' }
  }
  if (task.title === '完成今天最重要的一件事' && task.note === '只推进 25 分钟，也算向前。') {
    return { ...task, title: '拿下今天最重要的一件事', note: '先攻 25 分钟，势头就来了。' }
  }
  if (task.title === '收尾，然后放心休息' && task.note === '把没做完的交给明天。') {
    return { ...task, title: '漂亮收尾，放心休息', note: '今天有战绩，明天继续升级。' }
  }
  return task
})

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return seedTasks()
    const parsed = JSON.parse(saved) as Task[]
    return Array.isArray(parsed) ? migrateStarterCopy(parsed) : seedTasks()
  } catch {
    return seedTasks()
  }
}

function loadNotes(): Record<string, string> {
  try {
    const saved = localStorage.getItem(NOTES_KEY)
    if (!saved) return {}
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'string'),
    )
  } catch {
    return {}
  }
}

function rollOver(tasks: Task[]): Task[] {
  const today = todayKey()
  return tasks.map((task) =>
    !task.done && task.date < today ? { ...task, date: today, rolled: true } : task,
  )
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<Task>
  return typeof task.id === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(task.date ?? '')
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(task.time ?? '')
    && typeof task.title === 'string'
    && task.title.trim().length > 0
    && typeof task.done === 'boolean'
    && tones.includes(task.tone as Tone)
    && (task.note === undefined || typeof task.note === 'string')
}

const dateLabel = (key: string) => {
  const date = fromKey(key)
  const today = todayKey()
  const prefix = key === today ? '今天' : key === offsetDate(today, 1) ? '明天' : key === offsetDate(today, -1) ? '昨天' : ''
  const detail = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date)
  return prefix ? `${prefix} · ${detail}` : detail
}

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，拿下一件就收工。'
  if (hour < 11) return '早上好，今天先拿下一件。'
  if (hour < 14) return '中午好，现在推进一格。'
  if (hour < 18) return '下午好，先把第一步拿下。'
  return '晚上好，再漂亮收个尾。'
}

const dayHeading = (key: string) => {
  const today = todayKey()
  if (key === today) return greeting()
  if (key === offsetDate(today, 1)) return '明天的第一步，今晚先占位。'
  if (key === offsetDate(today, -1)) return '昨日战绩，做过的都算数。'
  return key > today ? '提前布阵，到时直接开干。' : '翻翻战绩，再继续向前。'
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => rollOver(loadTasks()))
  const [activeDate, setActiveDate] = useState(todayKey())
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [dark, setDark] = useState(() => localStorage.getItem('peigens-theme') === 'dark')
  const [colorful, setColorful] = useState(() => localStorage.getItem('peigens-color-mode') === 'colorful')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [focusedTaskId, setFocusedTaskId] = useState<string>()
  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>(loadNotes)
  const [historyOpen, setHistoryOpen] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLElement>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const motionFrameRef = useRef<number | null>(null)
  const motionVelocityRef = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(dailyNotes))
  }, [dailyNotes])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('peigens-theme', dark ? 'dark' : 'light')
  }, [dark])

  useLayoutEffect(() => {
    document.documentElement.dataset.color = colorful ? 'colorful' : 'restrained'
    localStorage.setItem('peigens-color-mode', colorful ? 'colorful' : 'restrained')
  }, [colorful])

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
    if (motionFrameRef.current !== null) window.cancelAnimationFrame(motionFrameRef.current)
  }, [])

  useEffect(() => {
    const refreshDay = () => {
      const freshNow = new Date()
      setNow(freshNow)
      setTasks((current) => rollOver(current))
    }
    const timer = window.setInterval(refreshDay, 60_000)
    const onVisibility = () => document.visibilityState === 'visible' && refreshDay()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const dayTasks = useMemo(
    () => tasks.filter((task) => task.date === activeDate).sort((a, b) => a.time.localeCompare(b.time)),
    [tasks, activeDate],
  )
  const completed = dayTasks.filter((task) => task.done).length
  const progress = dayTasks.length ? Math.round((completed / dayTasks.length) * 100) : 0
  const progressStyle = { '--progress-value': progress } as React.CSSProperties
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const nextTaskId = activeDate === todayKey()
    ? (dayTasks.find((task) => !task.done && task.time >= nowTime) ?? dayTasks.find((task) => !task.done) ?? dayTasks.at(-1))?.id
    : (dayTasks.find((task) => !task.done) ?? dayTasks[0])?.id
  const visibleFocusId = focusedTaskId && dayTasks.some((task) => task.id === focusedTaskId) ? focusedTaskId : nextTaskId
  const focusIndex = dayTasks.findIndex((task) => task.id === visibleFocusId)
  const today = todayKey()
  const visibleDates = [offsetDate(today, -1), today, offsetDate(today, 1)]
  const visibleDateIndex = visibleDates.indexOf(activeDate)
  const archiveDates = useMemo(() => {
    const archiveBefore = offsetDate(todayKey(), -1)
    return Array.from(new Set([...tasks.map((task) => task.date), ...Object.keys(dailyNotes)]))
      .filter((date) => date < archiveBefore && (tasks.some((task) => task.date === date) || dailyNotes[date]?.trim()))
      .sort((a, b) => b.localeCompare(a))
  }, [tasks, dailyNotes, now])

  const moveVisibleDate = (direction: -1 | 1) => {
    const nextDate = visibleDates[visibleDateIndex + direction]
    if (nextDate) setActiveDate(nextDate)
  }

  const returnToToday = () => {
    setHistoryOpen(false)
    setActiveDate(todayKey())
  }

  const timelineFocusOffset = (timeline: HTMLElement) => {
    const anchor = timeline.parentElement?.querySelector<HTMLElement>('.focus-anchor')
    return anchor?.offsetTop ?? timeline.clientHeight / 2
  }

  const centeredTop = (timeline: HTMLElement, row: HTMLElement) => {
    const rawTop = row.offsetTop + row.offsetHeight / 2 - timelineFocusOffset(timeline)
    return Math.max(0, Math.min(rawTop, timeline.scrollHeight - timeline.clientHeight))
  }

  useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline || !nextTaskId) return
    setFocusedTaskId(nextTaskId)
    let cancelled = false
    const centerFocusedTask = () => {
      if (cancelled) return
      const focused = timeline.querySelector<HTMLElement>('[data-time-focus="true"]')
      if (!focused) return
      const top = centeredTop(timeline, focused)
      timeline.scrollTo({ top, behavior: 'auto' })
    }
    const frame = window.requestAnimationFrame(centerFocusedTask)
    document.fonts.ready.then(centerFocusedTask)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [nextTaskId, dayTasks.length])

  const updateScrollFocus = () => {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const currentTimeline = timelineRef.current
      if (!currentTimeline) return
      const rows = Array.from(currentTimeline.querySelectorAll<HTMLElement>('.task-row'))
      if (!rows.length) return
      const center = currentTimeline.scrollTop + timelineFocusOffset(currentTimeline)
      let closest: HTMLElement | undefined
      let closestDistance = Number.POSITIVE_INFINITY

      rows.forEach((row) => {
        const rowCenter = row.offsetTop + row.offsetHeight / 2
        const distance = Math.abs(rowCenter - center)
        const steps = distance / Math.max(row.offsetHeight, 1)
        const scale = Math.max(.76, 1 - steps * .09)
        const opacity = Math.max(.3, 1 - steps * .28)
        row.style.setProperty('--focus-scale', scale.toFixed(3))
        row.style.setProperty('--focus-opacity', opacity.toFixed(3))
        if (distance < closestDistance) {
          closest = row
          closestDistance = distance
        }
      })

      const closestId = closest?.dataset.taskId
      if (closestId) setFocusedTaskId((current) => current === closestId ? current : closestId)
    })
  }

  const advanceTimelineMotion = () => {
    motionFrameRef.current = null
    const timeline = timelineRef.current
    if (!timeline) return

    const velocity = motionVelocityRef.current * .84
    if (Math.abs(velocity) < .18) {
      motionVelocityRef.current = 0
      timeline.classList.remove('is-moving')
      return
    }

    motionVelocityRef.current = Math.max(-28, Math.min(28, velocity))
    const before = timeline.scrollTop
    timeline.scrollTop = before + motionVelocityRef.current
    if (timeline.scrollTop === before) {
      motionVelocityRef.current = 0
      timeline.classList.remove('is-moving')
      return
    }
    motionFrameRef.current = window.requestAnimationFrame(advanceTimelineMotion)
  }

  const startTimelineMotion = () => {
    const timeline = timelineRef.current
    if (!timeline) return
    timeline.classList.add('is-moving')
    if (motionFrameRef.current === null) {
      motionFrameRef.current = window.requestAnimationFrame(advanceTimelineMotion)
    }
  }

  const handleTimelineWheel = (event: WheelEvent) => {
    event.preventDefault()
    const timeline = timelineRef.current
    if (!timeline) return
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 18
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? timeline.clientHeight
        : 1
    const delta = event.deltaY * multiplier
    if (delta === 0) return

    const impulse = Math.max(-22, Math.min(22, delta * .085))
    const currentVelocity = motionVelocityRef.current
    motionVelocityRef.current = Math.sign(impulse) !== Math.sign(currentVelocity) && currentVelocity !== 0
      ? impulse
      : Math.max(-28, Math.min(28, currentVelocity * .58 + impulse))
    startTimelineMotion()
  }

  useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline) return
    timeline.addEventListener('wheel', handleTimelineWheel, { passive: false })
    return () => timeline.removeEventListener('wheel', handleTimelineWheel)
  }, [])

  const addTask = (event: FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setNotice('先给我一个目标，大小都接得住。')
      return
    }
    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        date: activeDate,
        time,
        title: cleanTitle,
        done: false,
        tone: tones[current.length % tones.length],
      },
    ])
    setTitle('')
    setNotice('收到！今日任务槽 +1。')
  }

  const toggleTask = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  }

  const moveTomorrow = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, date: offsetDate(activeDate, 1), rolled: true } : task))
    setNotice('战术后撤，明天接着拿下。')
  }

  const deleteTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id))
    setNotice('已移除，火力集中在重要的事。')
  }

  const updateTaskTime = (id: string, nextTime: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, time: nextTime } : task))
    setNotice('时间就位，按新节奏出发。')
  }

  const prepareAppearanceTransition = () => {
    const root = document.documentElement
    if (!root.classList.contains('theme-ready')) {
      root.classList.add('theme-ready')
      void root.offsetWidth
    }
    return root
  }

  const toggleTheme = () => {
    const root = prepareAppearanceTransition()
    setDark((value) => {
      const nextDark = !value
      root.dataset.theme = nextDark ? 'dark' : 'light'
      return nextDark
    })
  }

  const toggleColorful = () => {
    const root = prepareAppearanceTransition()
    setColorful((value) => {
      const nextColorful = !value
      root.dataset.color = nextColorful ? 'colorful' : 'restrained'
      return nextColorful
    })
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, tasks, notes: dailyNotes }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `培根斯的一天-${todayKey()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('备份到手，计划稳稳兜住。')
  }

  const importData = async (file?: File) => {
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (Array.isArray(parsed) && parsed.every(isTask)) {
        setTasks(rollOver(parsed))
      } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const backup = parsed as { tasks?: unknown; notes?: unknown }
        if (!Array.isArray(backup.tasks) || !backup.tasks.every(isTask)) throw new Error('invalid')
        setTasks(rollOver(backup.tasks))
        if (backup.notes && typeof backup.notes === 'object' && !Array.isArray(backup.notes)) {
          setDailyNotes(Object.fromEntries(
            Object.entries(backup.notes).filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'string'),
          ))
        }
      } else {
        throw new Error('invalid')
      }
      setNotice('计划归队，继续推进！')
    } catch {
      setNotice('这份备份没读懂，换个有效的 JSON 再试。')
    }
  }

  return (
    <div className={`app-shell ${historyOpen ? 'is-history' : 'is-day'}`}>
      <header className="topbar">
        <button className="brand" onClick={returnToToday} aria-label="回到今天">
          <span className="brand-dot" aria-hidden="true" />
          <span>培根斯的一天</span>
        </button>
        <div className="top-actions">
          <button
            className={`history-button ${historyOpen ? 'is-active' : ''}`}
            onClick={() => historyOpen ? returnToToday() : setHistoryOpen(true)}
            aria-pressed={historyOpen}
            aria-label={historyOpen ? '回到今天' : '查看历史记录'}
          >
            <ClockCounterClockwise />
            <span>{historyOpen ? '回到今天' : '历史'}</span>
          </button>
          {!dark && <button
            className={`color-button ${colorful ? 'is-active' : ''}`}
            onClick={toggleColorful}
            aria-label={colorful ? '关闭多彩模式' : '打开多彩模式'}
            aria-pressed={colorful}
            title={colorful ? '切换到三色简约模式' : '切换到多彩模式'}
          >
            <Palette />
            <span>色彩</span>
          </button>}
          <button className="icon-button" onClick={exportData} aria-label="导出备份" title="导出备份"><DownloadSimple /></button>
          <button className="icon-button" onClick={() => importRef.current?.click()} aria-label="导入备份" title="导入备份"><UploadSimple /></button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => importData(event.target.files?.[0])} />
          <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={dark ? '切换到浅色' : '切换到深色'} aria-pressed={dark} title="切换主题">
            {dark ? <Sun /> : <MoonStars />}
          </button>
        </div>
      </header>

      {historyOpen ? (
        <main className="history-layout">
          <section className="history-view" aria-labelledby="history-title">
            <header className="history-heading">
              <div>
                <h1 id="history-title">历史记录</h1>
                <p>昨天仍在日程里；更早的日子在这里安静归档。</p>
              </div>
              <span>{archiveDates.length} 天</span>
            </header>
            {archiveDates.length === 0 ? (
              <div className="history-empty">
                <ClockCounterClockwise aria-hidden="true" />
                <h2>归档还空着</h2>
                <p>过完更多日子后，完成的事项和便笺会出现在这里。</p>
              </div>
            ) : (
              <div className="history-list">
                {archiveDates.map((date) => {
                  const archivedTasks = tasks
                    .filter((task) => task.date === date)
                    .sort((a, b) => a.time.localeCompare(b.time))
                  const doneCount = archivedTasks.filter((task) => task.done).length
                  const archivedNote = dailyNotes[date]?.trim()
                  return (
                    <details className="history-day" key={date}>
                      <summary>
                        <span className="history-date">{dateLabel(date)}</span>
                        <span className="history-meta">{doneCount}/{archivedTasks.length} 完成{archivedNote ? ' · 有便笺' : ''}</span>
                        <CaretDown aria-hidden="true" />
                      </summary>
                      <div className="history-day-body">
                        {archivedNote && <p className="history-note">{archivedNote}</p>}
                        {archivedTasks.length > 0 ? (
                          <ul className="history-tasks">
                            {archivedTasks.map((task) => (
                              <li key={task.id}>
                                <time>{task.time}</time>
                                <span>{task.title}</span>
                                <span className="history-task-status">{task.done && <Check weight="bold" aria-label="已完成" />}</span>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="history-no-tasks">这天只留下了一张便笺。</p>}
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      ) : (
      <main className="day-layout">
        <NightSpeedLines />
        <section className="day-intro" aria-labelledby="day-title">
          <div className="date-nav">
            <button className="icon-button quiet" onClick={() => moveVisibleDate(-1)} aria-label="前一天" disabled={visibleDateIndex <= 0}><ArrowLeft /></button>
            <button className="date-chip" onClick={() => setActiveDate(todayKey())}><CalendarDots />{dateLabel(activeDate)}</button>
            <button className="icon-button quiet" onClick={() => moveVisibleDate(1)} aria-label="后一天" disabled={visibleDateIndex >= visibleDates.length - 1}><ArrowRight /></button>
          </div>
          <div className="intro-copy">
            <h1 id="day-title">{dayHeading(activeDate)}</h1>
            <p>{dayTasks.length === 0 ? '还没开局？扔进一件 10 分钟能开干的。' : completed === dayTasks.length ? '漂亮，全数拿下！现在放心去玩。' : '别等满格状态，先拿下下一件。'}</p>
          </div>
          <section className="note-pad" aria-labelledby="note-title">
            <div className="note-pad-heading">
              <label id="note-title" htmlFor="daily-note">自由便笺</label>
              <span>自动保存在本机</span>
            </div>
            <textarea
              id="daily-note"
              value={dailyNotes[activeDate] ?? ''}
              onChange={(event) => setDailyNotes((current) => ({ ...current, [activeDate]: event.target.value }))}
              placeholder="想法、提醒、突然冒出来的一句话，都写在这里。"
              rows={4}
            />
          </section>
          <svg className={`progress-line ${progress > 0 ? 'has-progress' : ''}`} viewBox="0 0 200 20" preserveAspectRatio="none" role="img" aria-label={`今日完成度 ${progress}%`}>
            <path className="progress-track" strokeLinecap="round" d="M 3 12 C 24 5, 48 5, 69 11 S 111 17, 135 9 S 176 5, 197 12" />
            <path className="progress-reveal progress-glow" strokeLinecap="round" pathLength="100" style={progressStyle} d="M 3 12 C 24 5, 48 5, 69 11 S 111 17, 135 9 S 176 5, 197 12" aria-hidden="true" />
            <path className="progress-reveal progress-value" strokeLinecap="round" pathLength="100" style={progressStyle} d="M 3 12 C 24 5, 48 5, 69 11 S 111 17, 135 9 S 176 5, 197 12" />
          </svg>
          <div className="progress-copy"><span>{completed}/{dayTasks.length} 已完成</span><span>{progress}%</span></div>
        </section>

        <div className="timeline-stage">
          <span className="focus-anchor" aria-hidden="true" />
          <section
            className="timeline"
            aria-label="每日时间线，可用鼠标滚轮自由浏览事项"
            ref={timelineRef}
            onScroll={updateScrollFocus}
            tabIndex={0}
          >
          {dayTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-orbit" aria-hidden="true" />
              <h2>今天还没开局</h2>
              <p>扔进一件 10 分钟能开干的，马上开场。</p>
            </div>
          ) : dayTasks.map((task, index) => {
            const distance = focusIndex < 0 ? 0 : Math.abs(index - focusIndex)
            const focusScale = Math.max(.76, 1 - distance * .09)
            const focusOpacity = Math.max(.3, 1 - distance * .28)
            const isFocused = task.id === visibleFocusId
            return (
            <article
              className={`task-row ${task.done ? 'is-done' : ''} ${isFocused ? 'is-next' : ''}`}
              key={task.id}
              data-task-id={task.id}
              data-time-focus={task.id === nextTaskId ? 'true' : undefined}
              aria-current={isFocused ? 'true' : undefined}
              style={{ '--delay': `${index * 45}ms`, '--focus-scale': focusScale, '--focus-opacity': focusOpacity } as React.CSSProperties}
            >
              <time>{task.time}</time>
              <div className="rail" aria-hidden="true"><span className={`node ${task.tone}`} /></div>
              <div className={`task-card ${task.tone}`}>
                <NightSpeedLines className="task-frost-lines" />
                <button className="task-main" onClick={() => toggleTask(task.id)} aria-label={`${task.done ? '取消完成' : '完成'}：${task.title}`}>
                  <span className="check-mark" aria-hidden="true">{task.done && <Check weight="bold" />}</span>
                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    {task.note && <small>{task.note}</small>}
                    {task.rolled && <em>昨日接力，今天拿下</em>}
                  </span>
                </button>
                <div className="task-tools">
                  <label className="task-time">
                    <span className="sr-only">调整“{task.title}”的时间</span>
                    <input type="time" value={task.time} onChange={(event) => updateTaskTime(task.id, event.target.value)} aria-label={`调整“${task.title}”的时间`} />
                  </label>
                  {!task.done && <button onClick={() => moveTomorrow(task.id)}>明天拿下 <ArrowRight /></button>}
                  <button className="delete" onClick={() => deleteTask(task.id)} aria-label={`删除：${task.title}`}><Trash /></button>
                </div>
              </div>
            </article>
          )})}
          </section>
        </div>
      </main>
      )}

      {!historyOpen && <form className="quick-add" onSubmit={addTask}>
        <label className="sr-only" htmlFor="new-task">添加计划</label>
        <input id="new-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="下一件，拿下什么？" autoComplete="off" />
        <label className="time-field">
          <span className="sr-only">时间</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <button className="add-button" type="submit"><Plus weight="bold" /><span>放进时间线</span></button>
      </form>}
      <div className="notice" role="status" aria-live="polite">{notice}</div>
    </div>
  )
}
