const API = 'https://schedule.sfedu.ru/APIv1';

const json = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
    return res.json();
};

export const DEGREE_LABELS = {
    bachelor: 'Бакалавриат',
    master: 'Магистратура',
};

// Бакалавриат (1-4 курс) + магистратура (1-2 курс); аспирантура (8, 9) не показываем
export const GRADE_IDS = [1, 2, 3, 4, 6, 7];

export const fetchWeek = async () => {
    const data = await json(`${API}/week`);
    return data.week;
};

// Возвращает массив курсов с вложенными группами:
// [{ id, degree, label, groups: [{id, name, num, gradeid}] }]
export const fetchGroups = async () => {
    const grades = await json(`${API}/grade/list`);
    const wanted = grades
        .filter(g => GRADE_IDS.includes(g.id))
        .sort((a, b) => GRADE_IDS.indexOf(a.id) - GRADE_IDS.indexOf(b.id));

    const lists = await Promise.all(
        wanted.map(g => json(`${API}/group/forGrade/${g.id}`))
    );

    return wanted.map((g, i) => ({
        id: g.id,
        degree: g.degree,
        num: g.num,
        label: `${DEGREE_LABELS[g.degree]}, ${g.num} курс`,
        groups: lists[i],
    }));
};

export const fetchSchedule = (groupId) => json(`${API}/schedule/group/${groupId}`);
