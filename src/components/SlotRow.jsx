import React from 'react';

const DAY_HUES = {
    0: 'text-blue',
    1: 'text-green',
    2: 'text-orange',
    3: 'text-pink',
    4: 'text-lilac',
    5: 'text-green-light',
};

const DAY_BADGE_STYLES = {
    0: 'border-blue/30 text-blue bg-blue/5',
    1: 'border-green/30 text-green bg-green/5',
    2: 'border-orange/30 text-orange bg-orange/5',
    3: 'border-pink/30 text-pink bg-pink/5',
    4: 'border-lilac/30 text-lilac bg-lilac/5',
    5: 'border-green-light/30 text-green-light bg-green-light/5',
};

const LessonCard = ({ lesson, hueClass, badgeStyle }) => {
    const main = lesson.curricula[0];
    const teachers = [...new Set(lesson.curricula.map(c => c.teachername).filter(Boolean))];

    // Determine room display: if not subgroups, find distinct rooms
    const distinctRooms = [...new Set(lesson.curricula.map(c => (c.roomname || '').trim()).filter(Boolean))];
    const validRooms = distinctRooms.filter(r => r !== '?');
    const primaryRoom = validRooms.length > 0 ? validRooms.join(', ') : null;

    return (
        <div className="flex flex-col gap-1 text-left w-full">
            {/* Top row: Badges and Room */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                    {lesson.type !== 'full' && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[10.5px] font-mono border ${badgeStyle}`}>
                            {lesson.type === 'upper' ? '↑ верхняя неделя' : '↓ нижняя неделя'}
                        </span>
                    )}
                    {lesson.isLecture && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[10.5px] font-mono text-cream-muted bg-white/[0.04] border border-hairline/60">
                            лек.
                        </span>
                    )}
                    {lesson.hasSubgroups && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[10.5px] font-mono text-cream-muted bg-white/[0.04] border border-hairline/60">
                            {lesson.subcount} подгр.
                        </span>
                    )}
                </div>

                {!lesson.hasSubgroups && primaryRoom && (
                    <div className="font-mono text-[11.5px] text-cream font-medium shrink-0">
                        {primaryRoom.toLowerCase().includes('онлайн') ? primaryRoom : `ауд. ${primaryRoom}`}
                    </div>
                )}
            </div>

            {/* Subject name */}
            <div className={`font-semibold text-[13px] sm:text-[14px] leading-snug break-words ${hueClass}`}>
                {main?.subjectname || main?.subjectabbr || 'Предмет'}
            </div>

            {/* Teachers */}
            {teachers.length > 0 && (
                <div className="text-cream-muted text-[11.5px] sm:text-[12px] leading-tight break-words">
                    {teachers.join(', ')}
                </div>
            )}

            {/* Info line (e.g. format or time note) */}
            {lesson.info && (
                <div className="font-mono text-[10.5px] text-cream-muted flex items-center gap-1.5 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-cream-muted shrink-0" />
                    <span className="break-words">{lesson.info}</span>
                </div>
            )}

            {/* Subgroups breakdown (if multiple subgroups) */}
            {lesson.hasSubgroups && lesson.curricula.length > 0 && (
                <div className="mt-1 pt-1 border-t border-hairline/40 flex flex-wrap gap-1">
                    {lesson.curricula.map((c, i) => {
                        const room = c.roomname && c.roomname.trim() !== '?' ? c.roomname.trim() : null;
                        return (
                            <div
                                key={i}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-hairline/40 text-[10px] sm:text-[10.5px] font-mono text-cream-muted"
                                title={c.teachername ? `${c.teachername}` : undefined}
                            >
                                <span className="text-cream font-medium">#{c.subnum}</span>
                                <span>{room ? (room.toLowerCase().includes('онлайн') ? room : `ауд. ${room}`) : '—'}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const EmptyCell = ({ label }) => (
    <div className="flex items-center justify-center h-full min-h-[58px] px-2 py-2">
        <span className="font-mono text-[11px] text-hairline select-none">{label}</span>
    </div>
);

const SlotRow = ({ slot, lessonsByStart, dayCols, today, onEmptyClick }) => {
    return (
        <React.Fragment>
            {/* Ячейка времени */}
            <div className="sticky left-0 z-20 bg-canvas flex flex-col justify-center px-2.5 py-2 border-t border-r border-hairline/60">
                <div className="font-mono text-[13px] sm:text-[14px] text-cream font-medium">{slot.start}</div>
                <div className="font-mono text-[10.5px] text-cream-muted">{slot.end}</div>
            </div>

            {dayCols.map((day) => {
                const allSlotLessons = lessonsByStart[day.num]?.filter(l => l.start === slot.start) || [];

                // Deduplicate identical lessons in the same slot (e.g. same uberid & timeslot)
                const lessons = [];
                const seen = new Set();
                for (const l of allSlotLessons) {
                    const key = `${l.uberid || l.id}-${l.timeslot}-${l.curricula?.[0]?.subjectname || ''}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        lessons.push(l);
                    }
                }

                const isToday = today === day.num;
                const hasLessons = lessons.length > 0;
                const hueClass = DAY_HUES[day.num] || 'text-cream';
                const badgeStyle = DAY_BADGE_STYLES[day.num] || 'border-cream/30 text-cream bg-white/5';

                return (
                    <div
                        key={day.num}
                        className={`min-h-[58px] border-t border-l border-hairline/60 ${
                            isToday ? 'bg-white/[0.03]' : ''
                        } ${hasLessons ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.02]'}`}
                        onClick={() => !hasLessons && onEmptyClick?.(day, slot)}
                    >
                        {hasLessons ? (
                            <div className="p-2 sm:p-2.5 flex flex-col justify-center gap-2 h-full">
                                {lessons.map((lesson, idx) => (
                                    <div
                                        key={lesson.id || idx}
                                        className={idx > 0 ? 'pt-2 border-t border-hairline/60' : ''}
                                    >
                                        <LessonCard
                                            lesson={lesson}
                                            hueClass={hueClass}
                                            badgeStyle={badgeStyle}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyCell label="—" />
                        )}
                    </div>
                );
            })}
        </React.Fragment>
    );
};

export default SlotRow;
