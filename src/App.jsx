import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {RefreshCw, AlertCircle, Github} from 'lucide-react';
import WeekToggle from './components/WeekToggle';
import SlotRow, {LessonCard, DAY_HUES, DAY_BADGE_STYLES} from './components/SlotRow';
import CustomSelect from './components/CustomSelect';
import ThemeToggle from './components/ThemeToggle';
import {mergeScheduleData, filterByWeek} from './utils/parser';
import {fetchGroups, fetchSchedule, fetchWeek, DEGREE_LABELS} from './utils/api';

const DAYS = [
    {num: 0, name: 'Понедельник'},
    {num: 1, name: 'Вторник'},
    {num: 2, name: 'Среда'},
    {num: 3, name: 'Четверг'},
    {num: 4, name: 'Пятница'},
    {num: 5, name: 'Суббота'},
];

const SLOTS = [
    {start: '08:00', end: '09:35'},
    {start: '09:50', end: '11:25'},
    {start: '11:55', end: '13:30'},
    {start: '13:45', end: '15:20'},
    {start: '15:50', end: '17:25'},
    {start: '17:40', end: '19:15'},
    {start: '19:30', end: '21:05'},
];

const LS_KEYS = {
    grade: 'rs_grade',
    group: 'rs_group',
    week: 'rs_week',
    groups: 'rs_groups',
    schedule: id => `rs_schedule_${id}`,
};

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

const Skeleton = () => (
    <div className="border border-hairline rounded-[8px] overflow-hidden">
        <div className="grid grid-cols-[68px_repeat(6,minmax(170px,1fr))]">
            {Array.from({length: 42}).map((_, i) => (
                <div key={i} className="h-[58px] border-t border-l border-hairline/50 animate-pulse" />
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

    // 2. Инициализация курса и группы: по умолчанию Бакалавриат 2 курс, 1 группа ФИИТ
    useEffect(() => {
        if (!groupsData || groupsData.length === 0) return;

        let activeGrade = groupsData.find(g => g.id === gradeId);
        if (!activeGrade) {
            // Ищем бакалавриат 2 курс по умолчанию
            activeGrade = groupsData.find(g => g.degree === 'bachelor' && (g.num === 2 || g.id === 2)) || groupsData[0];
            setGradeId(activeGrade.id);
            writeLS(LS_KEYS.grade, activeGrade.id);
        }

        const currentInGrade = activeGrade.groups?.find(g => g.id === groupId);
        if (!currentInGrade) {
            // Ищем группу ФИИТ 1, если нет — первую доступную
            const fiit1 = activeGrade.groups?.find(
                g => (g.name || '').toUpperCase().includes('ФИИТ') && Number(g.num) === 1
            );
            const fallbackGroup = fiit1 || activeGrade.groups?.[0];
            if (fallbackGroup) {
                setGroupId(fallbackGroup.id);
                writeLS(LS_KEYS.group, fallbackGroup.id);
            }
        }
    }, [groupsData, gradeId, groupId]);

    // 3. Грузим расписание группы
    const fetchScheduleFor = useCallback(async (gid, force = false) => {
        if (!gid) return;

        const cached = readLS(LS_KEYS.schedule(gid));
        if (cached) {
            setSchedule(cached);
            if (!force) {
                // Уже сохранено в кэше — не нагружаем сервер повторными фоновыми запросами
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchSchedule(gid);
            const merged = mergeScheduleData(data.lessons, data.curricula);
            writeLS(LS_KEYS.schedule(gid), merged);
            setSchedule(merged);
        } catch (err) {
            console.error('schedule fetch failed:', err);
            if (!cached) {
                setError('Не удалось загрузить расписание группы. Проверьте соединение.');
            } else {
                setError('Ошибка сети — показываем сохраненное расписание.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScheduleFor(groupId);
    }, [groupId, fetchScheduleFor]);

    // 4. Определяем текущую неделю для подсказки
    useEffect(() => {
        fetchWeek()
            .then(n => setApiWeek(n))
            .catch(() => {});
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

    const changeGrade = (id) => {
        const num = id ? Number(id) : null;
        setGradeId(num);
        writeLS(LS_KEYS.grade, num);

        if (num && groupsData) {
            const targetGrade = groupsData.find(g => g.id === num);
            if (targetGrade?.groups?.length) {
                const fiit1 = targetGrade.num === 2
                    ? targetGrade.groups.find(g => (g.name || '').toUpperCase().includes('ФИИТ') && Number(g.num) === 1)
                    : null;
                const nextGroup = fiit1 || targetGrade.groups[0];
                setGroupId(nextGroup.id);
                writeLS(LS_KEYS.group, nextGroup.id);
            }
        }
    };

    const changeGroup = (id) => {
        const num = id ? Number(id) : null;
        setGroupId(num);
        writeLS(LS_KEYS.group, num);
    };

    const refresh = () => {
        fetchScheduleFor(groupId, true);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="px-4 sm:px-6 md:px-10 pt-5 pb-3">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
                        <div>
                            <h1 className="font-semibold text-[clamp(28px,5vw,50px)] leading-[0.95] tracking-display">
                                РАСПИСАНИЕ
                            </h1>
                            <div className="font-mono text-[12px] sm:text-[13px] text-cream-muted mt-1.5">
                                {currentGrade
                                    ? `${DEGREE_LABELS[currentGrade.degree] || 'Курс'} · ${currentGrade.num ?? currentGrade.label?.match(/\d+/)?.[0]} курс`
                                    : 'Мехмат · ЮФУ'}
                                <span className="text-hairline mx-2">/</span>
                                {groupName || 'группа не выбрана'}
                                <span className="text-hairline mx-2">/</span>
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
                                className="pill"
                                title="Обновить расписание"
                            >
                                <RefreshCw
                                    size={14}
                                    className={loading ? 'animate-spin' : ''}
                                />
                                <span className="hidden sm:inline">Обновить</span>
                            </button>

                            <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        </div>
                    </div>
                </div>
            </header>

            {groupErr && (
                <div className="px-4 sm:px-6 md:px-10 pb-3">
                    <div className="max-w-[1600px] mx-auto flex items-center gap-3 border border-orange text-orange rounded-[8px] px-4 py-2.5 text-sm font-medium">
                        <AlertCircle size={16} />
                        {groupErr}
                    </div>
                </div>
            )}

            {error && (
                <div className="px-4 sm:px-6 md:px-10 pb-3">
                    <div className="max-w-[1600px] mx-auto flex items-center gap-3 border border-orange text-orange rounded-[8px] px-4 py-2.5 text-sm font-medium">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                </div>
            )}

            <main className="px-4 sm:px-6 md:px-10 flex-1">
                <div className="max-w-[1600px] mx-auto">
                    {!groupsData || !groupId ? (
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
                                                className={`py-2 px-1 rounded-[10px] text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                    isSelected
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
                                <div className="min-w-[1088px]">
                                    {/* Шапка таблицы: дни недели */}
                                    <div className="grid grid-cols-[68px_repeat(6,minmax(170px,1fr))] border-b border-hairline">
                                        <div className="sticky left-0 z-30 bg-canvas flex items-center px-2.5 py-2.5 font-mono text-[11px] text-cream-muted border-r border-hairline/60">
                                            Время
                                        </div>
                                        {DAYS.map(d => (
                                            <div
                                                key={d.num}
                                                className={`px-2.5 py-2.5 text-center border-l border-hairline/60 ${
                                                    todayIdx === d.num
                                                        ? 'bg-cream/[0.04]'
                                                        : ''
                                                }`}
                                            >
                                                <div className="font-semibold text-[14px] text-cream">
                                                    {d.name}
                                                </div>
                                                <div className={`font-mono text-[10.5px] ${
                                                    todayIdx === d.num ? 'text-green' : 'text-cream-muted'
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
                                            className="grid grid-cols-[68px_repeat(6,minmax(170px,1fr))]"
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

            <footer className="px-6 md:px-10 py-10">
                <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-8">
                    <div className="font-mono text-[12px] text-cream-muted">
                        © 2026 · расписание мехмата ЮФУ · romka навайбкодил
                    </div>
                    <div className="flex items-center gap-6">
                        <a
                            href="https://schedule.sfedu.ru"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pill !py-2 !px-4 !text-[13px]"
                        >
                            Официальное расписание
                        </a>
                        <a
                            href="https://github.com/Kingrane/testtest"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pill !py-2 !px-4 !text-[13px]"
                        >
                            <Github size={14} />
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
