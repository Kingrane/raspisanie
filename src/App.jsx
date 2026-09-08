import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, AlertCircle, Github } from 'lucide-react';
import WeekToggle from './components/WeekToggle';
import SlotRow, { LessonCard, DAY_HUES, DAY_BADGE_STYLES } from './components/SlotRow';
import CustomSelect from './components/CustomSelect';
import ThemeToggle from './components/ThemeToggle';
import { mergeScheduleData, filterByWeek } from './utils/parser';
import { fetchGroups, fetchSchedule, fetchWeek, DEGREE_LABELS } from './utils/api';

const DAYS = [
    { num: 0, name: 'Понедельник' },
    { num: 1, name: 'Вторник' },
    { num: 2, name: 'Среда' },
    { num: 3, name: 'Четверг' },
    { num: 4, name: 'Пятница' },
    { num: 5, name: 'Суббота' },
];

const SLOTS = [
    { start: '08:00', end: '09:35' },
    { start: '09:50', end: '11:25' },
    { start: '11:55', end: '13:30' },
    { start: '13:45', end: '15:20' },
    { start: '15:50', end: '17:25' },
    { start: '17:40', end: '19:15' },
    { start: '19:30', end: '21:05' },
];

const LS_KEYS = {
    grade: 'rs_grade',
    group: 'rs_group',
    week: 'rs_week',
    groups: 'rs_groups',
};

const SS_SCHEDULE = id => `rs_schedule_${id}`;

const readLS = key => {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
};

const writeLS = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // localStorage может быть недоступен — это не критично
    }
};

// Кэш расписания живёт только пока открыта вкладка:
// переключение групп — мгновенно, закрытие вкладки — запрос заново.
const scheduleCache = new Map();

try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('rs_schedule_')) stale.push(k);
    }
    stale.forEach(k => localStorage.removeItem(k));
} catch {
    // ignore
}

const readScheduleCache = gid => {
    if (gid == null) return null;
    if (scheduleCache.has(gid)) return scheduleCache.get(gid);
    try {
        const raw = sessionStorage.getItem(SS_SCHEDULE(gid));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        scheduleCache.set(gid, parsed);
        return parsed;
    } catch {
        return null;
    }
};

const writeScheduleCache = (gid, data) => {
    scheduleCache.set(gid, data);
    try {
        sessionStorage.setItem(SS_SCHEDULE(gid), JSON.stringify(data));
    } catch {
        // sessionStorage может быть недоступен — память всё равно держит кэш
    }
};

const isFiit3 = g =>
    (g.name || '').trim().toUpperCase() === 'ФИИТ' && Number(g.num) === 3;

const findPreferredGroup = grade => {
    if (!grade?.groups?.length) return null;
    if (grade.degree === 'bachelor' && Number(grade.num) === 2) {
        return grade.groups.find(isFiit3) || grade.groups[0];
    }
    return grade.groups[0];
};

const Skeleton = () => (
    <div className="border border-hairline rounded-[8px] overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(6,minmax(160px,1fr))]">
            {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-[46px] border-t border-l border-hairline/50 animate-pulse" />
            ))}
        </div>
    </div>
);

function App() {
    const [groupsData, setGroupsData] = useState(null); // курсы с группами
    const [gradeId, setGradeId] = useState(() => readLS(LS_KEYS.grade) ?? null);
    const [groupId, setGroupId] = useState(() => readLS(LS_KEYS.group) ?? null);
    const [groupErr, setGroupErr] = useState(null);
    const [weekType, setWeekType] = useState(() => readLS(LS_KEYS.week) ?? 'all');
    const [apiWeek, setApiWeek] = useState(null);

    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const groupIdRef = useRef(groupId);
    groupIdRef.current = groupId;

    const today = new Date().getDay();
    const todayIdx = today === 0 ? 6 : today - 1;
    const [mobileDay, setMobileDay] = useState(() => (todayIdx >= 0 && todayIdx <= 5 ? todayIdx : 0));

    const [theme, setTheme] = useState(() => {
        const saved = readLS('rs_theme');
        if (saved) return saved;
        return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark';
    });

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
        writeLS('rs_theme', theme);
    }, [theme]);

    const transitionTimerRef = useRef(null);

    const toggleTheme = () => {
        if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
        }
        document.documentElement.classList.add('theme-transitioning');
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
        transitionTimerRef.current = setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
            transitionTimerRef.current = null;
        }, 520);
    };

    // 1. Грузим список курсов и групп (один раз)
    useEffect(() => {
        const cached = readLS(LS_KEYS.groups);
        if (cached) {
            const normalized = cached.map(g => ({
                ...g,
                num: g.num ?? Number(g.label?.match(/(\d+)\s*курс/)?.[1]) ?? (g.id <= 4 ? g.id : g.id - 5),
            }));
            setGroupsData(normalized);
        }
        fetchGroups()
            .then(data => {
                setGroupsData(data);
                writeLS(LS_KEYS.groups, data);
            })
            .catch(err => {
                console.error('groups fetch failed:', err);
                if (!cached) setGroupErr('Не удалось загрузить список групп');
            });
    }, []);

    const groups = useMemo(
        () => groupsData?.flatMap(g => g.groups) ?? [],
        [groupsData]
    );

    const currentGroup = groups.find(g => g.id === groupId) || null;
    const currentGrade = groupsData?.find(g => g.id === gradeId) || null;
    const groupName = currentGroup
        ? `${currentGroup.name}${currentGroup.num ? '-' + currentGroup.num : ''}`
        : '';

    // 2. Инициализация курса и группы: по умолчанию Бакалавриат 2 курс, ФИИТ-3
    useEffect(() => {
        if (!groupsData || groupsData.length === 0) return;

        let activeGrade = groupsData.find(g => g.id === gradeId);
        if (!activeGrade) {
            activeGrade = groupsData.find(g => g.degree === 'bachelor' && (g.num === 2 || g.id === 2)) || groupsData[0];
            setGradeId(activeGrade.id);
            writeLS(LS_KEYS.grade, activeGrade.id);
        }

        const currentInGrade = activeGrade.groups?.find(g => g.id === groupId);
        if (!currentInGrade) {
            const fallbackGroup = findPreferredGroup(activeGrade);
            if (fallbackGroup) {
                setGroupId(fallbackGroup.id);
                writeLS(LS_KEYS.group, fallbackGroup.id);
            }
        }
    }, [groupsData, gradeId, groupId]);

    // 3. Грузим расписание группы (кэш — только на время вкладки)
    const fetchScheduleFor = useCallback(async (gid, force = false) => {
        if (!gid) return;

        const cached = readScheduleCache(gid);
        if (cached && !force) {
            setSchedule(cached);
            setLoading(false);
            setError(null);
            return;
        }

        if (cached) {
            setSchedule(cached);
        } else if (groupIdRef.current === gid) {
            setSchedule(null);
        }
        setLoading(true);
        setError(null);

        try {
            const data = await fetchSchedule(gid);
            const merged = mergeScheduleData(data.lessons, data.curricula);
            writeScheduleCache(gid, merged);
            if (groupIdRef.current !== gid) return;
            setSchedule(merged);
        } catch (err) {
            console.error('schedule fetch failed:', err);
            if (groupIdRef.current !== gid) return;
            if (!cached) {
                setError('Не удалось загрузить расписание группы. Проверьте соединение.');
            } else {
                setError('Ошибка сети — показываем сохраненное расписание.');
            }
        } finally {
            if (groupIdRef.current === gid) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScheduleFor(groupId);
    }, [groupId, fetchScheduleFor]);

    // 4. Определяем текущую неделю для подсказки
    useEffect(() => {
        fetchWeek()
            .then(n => setApiWeek(n))
            .catch(() => { });
    }, []);

    const filtered = useMemo(
        () => (schedule ? filterByWeek(schedule, weekType) : []),
        [schedule, weekType]
    );

    const lessonsByDay = useMemo(() => {
        const map = {};
        for (const lesson of filtered) {
            if (lesson.day == null) continue;
            if (!map[lesson.day]) map[lesson.day] = [];
            map[lesson.day].push(lesson);
        }
        return map;
    }, [filtered]);
    const currentWeekLabel = apiWeek === null
        ? '…'
        : apiWeek % 2 === 0 ? 'верхняя' : 'нижняя';
    const changeWeek = (w) => {
        setWeekType(w);
        writeLS(LS_KEYS.week, w);
    };

    const applyGroup = (id) => {
        setGroupId(id);
        writeLS(LS_KEYS.group, id);
        if (!id) {
            setSchedule(null);
            return;
        }
        const cached = readScheduleCache(id);
        if (cached) {
            setSchedule(cached);
            setLoading(false);
            setError(null);
        } else {
            setSchedule(null);
            setLoading(true);
            setError(null);
        }
    };

    const changeGrade = (id) => {
        const num = id ? Number(id) : null;
        setGradeId(num);
        writeLS(LS_KEYS.grade, num);

        if (num && groupsData) {
            const targetGrade = groupsData.find(g => g.id === num);
            const nextGroup = findPreferredGroup(targetGrade);
            if (nextGroup) applyGroup(nextGroup.id);
        }
    };

    const changeGroup = (id) => {
        const num = id ? Number(id) : null;
        applyGroup(num);
    };

    const refresh = () => {
        fetchScheduleFor(groupId, true);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="px-4 sm:px-6 md:px-10 pt-4 sm:pt-5 pb-2.5">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2.5">
                        <div>
                            <h1 className="font-semibold text-[clamp(26px,3.2vw,38px)] leading-tight tracking-display">
                                РАСПИСАНИЕ
                            </h1>
                            <div className="font-mono text-[11.5px] sm:text-[12.5px] text-cream-muted mt-1">
                                {currentGrade
                                    ? `${DEGREE_LABELS[currentGrade.degree] || 'Курс'} · ${currentGrade.num ?? currentGrade.label?.match(/\d+/)?.[0]} курс`
                                    : 'Мехмат · ЮФУ'}
                                <span className="text-hairline mx-1.5">/</span>
                                {groupName || 'группа не выбрана'}
                                <span className="text-hairline mx-1.5">/</span>
                                неделя: {currentWeekLabel}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <CustomSelect
                                value={gradeId ?? ''}
                                options={groupsData ? groupsData.map(g => ({ id: g.id, label: g.label })) : []}
                                onChange={changeGrade}
                                placeholder="Курсы…"
                                disabled={!groupsData}
                            />

                            <CustomSelect
                                value={groupId ?? ''}
                                options={
                                    currentGrade?.groups
                                        ? currentGrade.groups.map(g => ({
                                            id: g.id,
                                            label: `${g.name}${g.num ? '-' + g.num : ''}`
                                        }))
                                        : []
                                }
                                onChange={changeGroup}
                                placeholder="Группа…"
                                disabled={!gradeId}
                            />

                            <WeekToggle currentWeek={weekType} onChange={changeWeek} />

                            <button
                                onClick={refresh}
                                disabled={loading}
                                className="pill !py-2 !px-4 !text-[13px] h-[38px]"
                                title="Обновить расписание"
                            >
                                <RefreshCw
                                    size={14}
                                    className={loading ? 'animate-spin' : ''}
                                />
                                <span className="hidden sm:inline">Обновить</span>
                            </button>

                            <ThemeToggle theme={theme} onToggle={toggleTheme} className="!w-[38px] !h-[38px]" />
                        </div>
                    </div>
                </div>
            </header>

            {groupErr && (
                <div className="px-4 sm:px-6 md:px-10 pb-2">
                    <div className="max-w-[1600px] mx-auto flex items-center gap-2.5 border border-orange text-orange rounded-[8px] px-3.5 py-2 text-xs sm:text-sm font-medium">
                        <AlertCircle size={16} />
                        {groupErr}
                    </div>
                </div>
            )}

            {error && (
                <div className="px-4 sm:px-6 md:px-10 pb-2">
                    <div className="max-w-[1600px] mx-auto flex items-center gap-2.5 border border-orange text-orange rounded-[8px] px-3.5 py-2 text-xs sm:text-sm font-medium">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                </div>
            )}

            <main className="px-4 sm:px-6 md:px-10 flex-1">
                <div className="max-w-[1600px] mx-auto">
                    {!groupsData || !groupId || (loading && !schedule) ? (
                        <Skeleton />
                    ) : (
                        <React.Fragment>
                            {/* Мобильный вид: вкладки дней недели + карточки пар */}
                            <div className="md:hidden fade-up">
                                {/* Переключатель дней недели */}
                                <div className="grid grid-cols-6 gap-1.5 mb-3.5">
                                    {DAYS.map(d => {
                                        const isSelected = mobileDay === d.num;
                                        const isToday = todayIdx === d.num;
                                        return (
                                            <button
                                                key={d.num}
                                                type="button"
                                                onClick={() => setMobileDay(d.num)}
                                                className={`py-2 px-1 rounded-[10px] text-center transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected
                                                    ? 'bg-cream text-canvas font-semibold shadow'
                                                    : 'border border-hairline/70 text-cream/90 hover:border-cream/40 bg-cream/[0.03]'
                                                    }`}
                                            >
                                                <span className="text-[12px] uppercase tracking-wider">
                                                    {d.name.slice(0, 2)}
                                                </span>
                                                {isToday && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-canvas' : 'bg-green'}`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Заголовок выбранного дня */}
                                <div className="flex items-center justify-between mb-3 px-0.5">
                                    <span className="text-[15px] font-semibold text-cream">
                                        {DAYS[mobileDay]?.name}
                                    </span>
                                    {todayIdx === mobileDay && (
                                        <span className="text-[11.5px] font-mono text-green font-medium">сегодня</span>
                                    )}
                                </div>

                                {/* Список пар выбранного дня */}
                                <div className="flex flex-col gap-3">
                                    {(() => {
                                        const dayLessons = lessonsByDay[mobileDay] || [];
                                        const activeSlots = SLOTS.map(slot => {
                                            const slotLessons = dayLessons.filter(l => l.start === slot.start);
                                            const unique = [];
                                            const seen = new Set();
                                            for (const l of slotLessons) {
                                                const key = `${l.uberid || l.id}-${l.timeslot}-${l.curricula?.[0]?.subjectname || ''}`;
                                                if (!seen.has(key)) {
                                                    seen.add(key);
                                                    unique.push(l);
                                                }
                                            }
                                            return { slot, lessons: unique };
                                        }).filter(s => s.lessons.length > 0);

                                        if (activeSlots.length === 0) {
                                            return (
                                                <div className="border border-hairline/60 rounded-[12px] p-8 text-center text-cream-muted font-mono text-[13px] bg-cream/[0.03]">
                                                    Пар нет, можно отдыхать 🎉
                                                </div>
                                            );
                                        }

                                        return activeSlots.map(({ slot, lessons }) => (
                                            <div
                                                key={slot.start}
                                                className="border border-hairline/70 rounded-[12px] bg-cream/[0.03] p-3.5 flex flex-col gap-2.5"
                                            >
                                                <div className="flex items-center justify-between border-b border-hairline/40 pb-2">
                                                    <div className="font-mono text-[12.5px] font-semibold text-cream flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green" />
                                                        <span>{slot.start} – {slot.end}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2.5 divide-y divide-hairline/40">
                                                    {lessons.map((lesson, idx) => (
                                                        <div key={lesson.id || idx} className={idx > 0 ? 'pt-2.5' : ''}>
                                                            <LessonCard
                                                                lesson={lesson}
                                                                hueClass={DAY_HUES[mobileDay] || 'text-cream'}
                                                                badgeStyle={DAY_BADGE_STYLES[mobileDay] || 'border-cream/30 text-cream bg-cream/5'}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Десктопный вид: полная недельная таблица */}
                            <div className="hidden md:block border border-hairline rounded-[8px] overflow-x-auto fade-up">
                                <div className="min-w-[1020px]">
                                    {/* Шапка таблицы: дни недели */}
                                    <div className="grid grid-cols-[60px_repeat(6,minmax(160px,1fr))] border-b border-hairline">
                                        <div className="sticky left-0 z-30 bg-canvas flex items-center px-2 py-1.5 font-mono text-[10px] text-cream-muted border-r border-hairline/60">
                                            Время
                                        </div>
                                        {DAYS.map(d => (
                                            <div
                                                key={d.num}
                                                className={`px-2 py-1 text-center border-l border-hairline/60 ${todayIdx === d.num
                                                    ? 'bg-cream/[0.04]'
                                                    : ''
                                                    }`}
                                            >
                                                <div className="font-semibold text-[13px] text-cream leading-tight">
                                                    {d.name}
                                                </div>
                                                <div className={`font-mono text-[9.5px] leading-tight ${todayIdx === d.num ? 'text-green' : 'text-cream-muted'
                                                    }`}>
                                                    {todayIdx === d.num ? 'сегодня' : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Строки пар */}
                                    {SLOTS.map(slot => (
                                        <div
                                            key={slot.start}
                                            className="grid grid-cols-[60px_repeat(6,minmax(160px,1fr))]"
                                        >
                                            <SlotRow
                                                slot={slot}
                                                lessonsByStart={lessonsByDay}
                                                dayCols={DAYS}
                                                today={todayIdx}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </React.Fragment>
                    )}
                </div>
            </main>

            <footer className="px-3 sm:px-5 md:px-8 py-5 mt-auto">
                <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3 border-t border-hairline/40 pt-2 text-[11px]">
                    <div className="font-mono text-cream-muted">
                        © 2026 · расписание мехмата ЮФУ · romka навайбкодил
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://schedule.sfedu.ru"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pill !py-1 !px-3 !text-[11.5px]"
                        >
                            Официальное расписание
                        </a>
                        <a
                            href="https://github.com/Kingrane/raspisanie"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pill !py-1 !px-3 !text-[11.5px]"
                        >
                            <Github size={13} />
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
