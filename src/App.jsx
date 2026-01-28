import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Github } from 'lucide-react';
import DayColumn from './components/DayColumn';
import WeekToggle from './components/WeekToggle';
import { mergeScheduleData, groupByDay, filterByWeek } from './utils/parser';

const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function App() {
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [weekType, setWeekType] = useState('all');
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            setError(null);

            const cached = localStorage.getItem('schedule_data');
            const cachedTime = localStorage.getItem('schedule_time');

            if (cached && cachedTime) {
                const data = JSON.parse(cached);
                setSchedule(data);
                setLastUpdate(new Date(cachedTime));
            }

            const response = await fetch(`${import.meta.env.BASE_URL}schedule.json?t=${Date.now()}`);

            if (!response.ok) {
                throw new Error('Не удалось загрузить расписание');
            }

            const data = await response.json();
            const merged = mergeScheduleData(data.lessons, data.curricula);

            localStorage.setItem('schedule_data', JSON.stringify(merged));
            localStorage.setItem('schedule_time', new Date().toISOString());

            setSchedule(merged);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Error fetching schedule:', err);
            setError('Не удалось загрузить свежее расписание. Показываем сохраненное.');
            if (!schedule) {
                setError('Нет данных. Проверьте подключение к интернету.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, []);

    const filteredSchedule = schedule ? filterByWeek(schedule, weekType) : [];
    const grouped = groupByDay(filteredSchedule);

    return (
        <div className="min-h-screen bg-neo-gray p-4">
            <header className="max-w-7xl mx-auto mb-8">
                <div className="bg-white border-3 border-black shadow-neo p-6 rounded-lg">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="font-display font-bold text-4xl md:text-5xl uppercase tracking-tight mb-2">
                                Расписание <span className="text-neo-pink">ФИИТ4</span>
                            </h1>
                            <p className="font-bold text-gray-600">
                                ФИИТ4 • Мехматик
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <WeekToggle currentWeek={weekType} onChange={setWeekType} />

                            <button
                                onClick={fetchSchedule}
                                disabled={loading}
                                className="neo-button text-sm flex items-center gap-2 rounded"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin-neo' : ''} strokeWidth={3} />
                                {loading ? 'Обновление...' : 'Обновить'}
                            </button>

                            {lastUpdate && (
                                <div className="text-xs font-bold text-gray-500">
                                    Обновлено: {lastUpdate.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {error && (
                <div className="max-w-7xl mx-auto mb-6">
                    <div className="bg-neo-orange text-white border-3 border-black shadow-neo p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle size={24} strokeWidth={3} />
                        <span className="font-bold">{error}</span>
                    </div>
                </div>
            )}

            {loading && !schedule && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-center items-center h-64">
                        <div className="bg-neo-yellow border-3 border-black shadow-neo p-6 rounded-lg animate-pulse-neo">
                            <RefreshCw size={32} className="animate-spin-neo" strokeWidth={3} />
                        </div>
                    </div>
                </div>
            )}

            {schedule && (
                <main className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {dayNames.map((dayName, index) => (
                            <DayColumn
                                key={index}
                                dayNumber={index}
                                dayName={dayName}
                                lessons={grouped[index] || []}
                            />
                        ))}
                    </div>
                </main>
            )}

            <footer className="max-w-7xl mx-auto mt-12 mb-6">
                <div className="flex justify-center items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
                    <a
                        href="https://github.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="neo-button-pink text-sm flex items-center gap-2 py-2 px-4"
                    >
                        <Github size={16} strokeWidth={3} />
                        GitHub
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default App;