export const parseTimeslot = (timeslotStr) => {
    const match = timeslotStr.match(/\((\d+),(\d+:\d+:\d+),(\d+:\d+:\d+),(\w+)\)/);
    if (!match) return null;

    const [, day, start, end, type] = match;

    return {
        day: parseInt(day),
        start: start.slice(0, 5),
        end: end.slice(0, 5),
        type,
    };
};

export const mergeScheduleData = (lessons, curricula) => {
    const merged = lessons.map(lesson => {
        const slot = parseTimeslot(lesson.timeslot);
        const lessonCurricula = curricula.filter(c => c.lessonid === lesson.id);

        return {
            ...lesson,
            ...slot,
            curricula: lessonCurricula,
            hasSubgroups: lesson.subcount > 1,
            isLecture: lesson.ctype === true || lesson.ctype === 'true',
        };
    });

    return merged.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.start.localeCompare(b.start);
    });
};

export const filterByWeek = (schedule, weekType) => {
    if (!weekType || weekType === 'all') return schedule;
    return schedule.filter(item =>
        item.type === 'full' || item.type === weekType
    );
};
