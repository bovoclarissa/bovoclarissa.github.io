import { daysBetween, todayIso } from './format.js';

export const SERIES_COLORS = ['#9C79D4', '#C4832A', '#3399BF', '#D6638F'];
export const MAX_COMPARED = SERIES_COLORS.length;

export const STATUSES = {
  planned: { label: 'Planned', note: 'Brewing in the cauldron' },
  active: { label: 'Active', note: 'Currently haunting my evenings' },
  paused: { label: 'Paused', note: 'Sleeping in its coffin' },
  completed: { label: 'Completed', note: '100 hours survived' },
};

export const RESOURCE_TYPES = {
  video: { label: 'Video', art: 'crystal' },
  channel: { label: 'YouTube channel', art: 'ghost' },
  guide: { label: 'Guide', art: 'candle' },
  website: { label: 'Website', art: 'spider' },
  course: { label: 'Course', art: 'potion' },
  book: { label: 'Book', art: 'moon' },
  safety: { label: 'Safety & rules', art: 'heart' },
};

export const DEFAULT_MILESTONES = [
  { share: 0.1, title: 'First steps', icon: 'mushroom', description: 'The first ten hours: everything is new and slightly terrifying.' },
  { share: 0.25, title: 'Getting somewhere', icon: 'potion', description: 'A quarter of the way. Something is definitely brewing.' },
  { share: 0.5, title: 'Halfway there', icon: 'moon', description: 'Half a moon of practice. No turning back now.' },
  { share: 0.75, title: 'Almost there', icon: 'bat', description: 'Three quarters done. The finish line is flapping nearby.' },
  { share: 1, title: 'Challenge completed!', icon: 'cauldron', description: 'The full ritual is complete.' },
];

export function totalMinutes(challenge) {
  return challenge.sessions.reduce((sum, session) => sum + session.minutes, 0);
}

export function targetMinutes(challenge) {
  return challenge.targetHours * 60;
}

export function progressOf(challenge) {
  return Math.min(1, totalMinutes(challenge) / targetMinutes(challenge));
}

export function remainingMinutes(challenge) {
  return Math.max(0, targetMinutes(challenge) - totalMinutes(challenge));
}

export function sortedSessions(challenge) {
  return [...challenge.sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function sortedDiary(challenge) {
  return [...challenge.diary].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function minutesUntil(challenge, iso) {
  return challenge.sessions.filter((session) => session.date <= iso).reduce((sum, session) => sum + session.minutes, 0);
}

export function cumulativeByDate(challenge) {
  const perDay = new Map();
  challenge.sessions.forEach((session) => perDay.set(session.date, (perDay.get(session.date) || 0) + session.minutes));
  let running = 0;
  return [...perDay.keys()].sort().map((date) => {
    running += perDay.get(date);
    return { date, minutes: running };
  });
}

export function lastActivity(challenge) {
  const dates = [...challenge.sessions.map((session) => session.date), ...challenge.diary.map((entry) => entry.date)];
  return dates.length ? dates.sort().at(-1) : null;
}

export function lastSessionDate(challenge) {
  const dates = challenge.sessions.map((session) => session.date).sort();
  return dates.at(-1) || null;
}

export function milestonesOf(challenge) {
  const defaults = DEFAULT_MILESTONES.map((milestone, index) => ({
    id: `default-${index}`,
    hours: Math.round(challenge.targetHours * milestone.share * 10) / 10,
    title: milestone.title,
    description: milestone.description,
    icon: milestone.icon,
    custom: false,
  }));
  const custom = (challenge.customMilestones || []).map((milestone) => ({ ...milestone, icon: milestone.icon || 'star', custom: true }));
  const points = cumulativeByDate(challenge);
  return [...defaults, ...custom]
    .sort((a, b) => a.hours - b.hours)
    .map((milestone) => {
      const reached = points.find((point) => point.minutes >= milestone.hours * 60);
      return { ...milestone, reachedOn: reached ? reached.date : null };
    });
}

export function statsOf(challenge) {
  const minutes = totalMinutes(challenge);
  const sessions = challenge.sessions.length;
  const activeDays = new Set(challenge.sessions.map((session) => session.date)).size;
  const today = todayIso();
  const endDate = challenge.status === 'completed' && challenge.completedDate ? challenge.completedDate : today;
  const journeyDays = challenge.startDate ? Math.max(1, daysBetween(challenge.startDate, endDate) + 1) : 0;
  const lastSession = lastSessionDate(challenge);
  return {
    minutes,
    sessions,
    activeDays,
    averageMinutes: sessions ? minutes / sessions : 0,
    longestMinutes: sessions ? Math.max(...challenge.sessions.map((session) => session.minutes)) : 0,
    hoursPerWeek: journeyDays ? (minutes / 60 / Math.max(7, journeyDays)) * 7 : 0,
    journeyDays,
    daysSinceLastSession: lastSession ? daysBetween(lastSession, today) : null,
  };
}

export function learningStyle(stats) {
  if (!stats.sessions) return { label: 'Still a mystery', description: 'No sessions yet. The crystal ball is foggy.' };
  if (stats.averageMinutes >= 150) return { label: 'Marathon witch', description: 'Long, intense rituals.' };
  if (stats.averageMinutes <= 40) return { label: 'Snack-sized sorcery', description: 'Short and frequent nibbles.' };
  if (stats.journeyDays >= 7 && stats.activeDays / (stats.journeyDays / 7) >= 3) return { label: 'Ritual regular', description: 'Shows up several times a week.' };
  return { label: 'Moonlight dabbler', description: 'Practises when the moon feels right.' };
}

export function visibleChallenges(data) {
  return data.challenges.filter((challenge) => !challenge.archived);
}

export function overviewOf(data) {
  const visible = visibleChallenges(data);
  const unfinished = visible.filter((challenge) => challenge.status !== 'completed');
  const cappedMinutes = visible.reduce((sum, challenge) => sum + Math.min(totalMinutes(challenge), targetMinutes(challenge)), 0);
  const allTargets = visible.reduce((sum, challenge) => sum + targetMinutes(challenge), 0);
  return {
    active: visible.filter((challenge) => challenge.status === 'active').length,
    completed: data.challenges.filter((challenge) => challenge.status === 'completed').length,
    investedMinutes: data.challenges.reduce((sum, challenge) => sum + totalMinutes(challenge), 0),
    remainingMinutes: unfinished.reduce((sum, challenge) => sum + remainingMinutes(challenge), 0),
    completion: allTargets ? cappedMinutes / allTargets : 0,
  };
}

export function currentObsession(data, windowDays = 14) {
  const today = todayIso();
  const candidates = visibleChallenges(data).filter((challenge) => challenge.status === 'active');
  let best = null;
  candidates.forEach((challenge) => {
    const recentMinutes = challenge.sessions
      .filter((session) => daysBetween(session.date, today) <= windowDays && daysBetween(session.date, today) >= 0)
      .reduce((sum, session) => sum + session.minutes, 0);
    if (recentMinutes > 0 && (!best || recentMinutes > best.recentMinutes)) best = { challenge, recentMinutes };
  });
  return best;
}

export function neglectedChallenges(data, thresholdDays) {
  const today = todayIso();
  return visibleChallenges(data)
    .filter((challenge) => challenge.status === 'active' && challenge.startDate)
    .map((challenge) => {
      const reference = lastSessionDate(challenge) || challenge.startDate;
      return { challenge, days: daysBetween(reference, today), neverStarted: !lastSessionDate(challenge) };
    })
    .filter((item) => item.days >= thresholdDays);
}

export function colorFor(challenge) {
  return SERIES_COLORS[(challenge.colorSlot ?? 0) % SERIES_COLORS.length];
}

export function nextColorSlot(data) {
  const usage = SERIES_COLORS.map(() => 0);
  visibleChallenges(data)
    .filter((challenge) => challenge.status !== 'completed')
    .forEach((challenge) => {
      usage[(challenge.colorSlot ?? 0) % usage.length] += 1;
    });
  return usage.indexOf(Math.min(...usage));
}

export function assignComparisonColors(challenges) {
  const used = new Set();
  const colors = new Map();
  const conflicted = [];
  challenges.forEach((challenge) => {
    const slot = (challenge.colorSlot ?? 0) % SERIES_COLORS.length;
    if (used.has(slot)) {
      conflicted.push(challenge);
      return;
    }
    used.add(slot);
    colors.set(challenge.id, SERIES_COLORS[slot]);
  });
  conflicted.forEach((challenge) => {
    const free = SERIES_COLORS.findIndex((_, slot) => !used.has(slot));
    used.add(free);
    colors.set(challenge.id, SERIES_COLORS[free]);
  });
  return colors;
}

export function collectImagePaths(data) {
  const paths = new Set();
  const add = (src) => {
    if (src && !src.startsWith('svg:') && !/^(https?:|data:|blob:)/.test(src)) paths.add(src);
  };
  data.challenges.forEach((challenge) => {
    add(challenge.cover);
    challenge.diary.forEach((entry) => entry.photos.forEach((photo) => add(photo.src)));
    const final = challenge.final || {};
    (final.beforePhotos || []).forEach((photo) => add(photo.src));
    (final.afterPhotos || []).forEach((photo) => add(photo.src));
  });
  return paths;
}

export function normalizeChallenge(raw) {
  return {
    id: raw.id,
    title: raw.title || 'Untitled experiment',
    category: raw.category || '',
    goal: raw.goal || '',
    description: raw.description || '',
    cover: raw.cover || 'svg:cauldron',
    colorSlot: Number.isInteger(raw.colorSlot) ? raw.colorSlot : 0,
    status: STATUSES[raw.status] ? raw.status : 'planned',
    archived: Boolean(raw.archived),
    targetHours: Number(raw.targetHours) > 0 ? Number(raw.targetHours) : 100,
    startDate: raw.startDate || null,
    completedDate: raw.completedDate || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    history: Array.isArray(raw.history) ? raw.history : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    diary: (Array.isArray(raw.diary) ? raw.diary : []).map((entry) => ({ photos: [], videos: [], ...entry })),
    customMilestones: Array.isArray(raw.customMilestones) ? raw.customMilestones : [],
    learned: Array.isArray(raw.learned) ? raw.learned : [],
    resources: Array.isArray(raw.resources) ? raw.resources : [],
    final: raw.final || null,
  };
}

export function normalizeData(raw) {
  return {
    meta: { schema: 1, revision: 0, exportedAt: null, updatedAt: null, ...(raw.meta || {}) },
    settings: { neglectDays: 7, ...(raw.settings || {}) },
    challenges: (raw.challenges || []).map(normalizeChallenge),
  };
}
