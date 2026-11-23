import { addDays } from './format.js';
import { milestonesOf, totalMinutes } from './model.js';

const allSessions = (data) => data.challenges.flatMap((challenge) => challenge.sessions);
const allEntries = (data) => data.challenges.flatMap((challenge) => challenge.diary);

function photoCount(data) {
  return data.challenges.reduce((sum, challenge) => {
    const diaryPhotos = challenge.diary.reduce((count, entry) => count + entry.photos.length, 0);
    const finalPhotos = (challenge.final?.beforePhotos?.length || 0) + (challenge.final?.afterPhotos?.length || 0);
    return sum + diaryPhotos + finalPhotos;
  }, 0);
}

function longestDailyStreak(data) {
  const days = [...new Set(allSessions(data).map((session) => session.date))].sort();
  let best = 0;
  let current = 0;
  days.forEach((day, index) => {
    current = index > 0 && addDays(days[index - 1], 1) === day ? current + 1 : 1;
    best = Math.max(best, current);
  });
  return best;
}

export const ACHIEVEMENTS = [
  { id: 'first-spark', title: 'First Spark', icon: 'candle', description: 'Log your very first session.', test: (data) => allSessions(data).length > 0 },
  { id: 'dear-diary', title: 'Dear Diary', icon: 'ghost', description: 'Write your first diary entry.', test: (data) => allEntries(data).length > 0 },
  { id: 'glorious-disaster', title: 'Glorious Disaster', icon: 'skull', description: 'Document a failure in the diary.', test: (data) => allEntries(data).some((entry) => entry.failure) },
  { id: 'shutterbug', title: 'Spooky Shutterbug', icon: 'crystal', description: 'Upload 10 photos.', test: (data) => photoCount(data) >= 10 },
  { id: 'marathon', title: 'Marathon Witch', icon: 'potion', description: 'Survive a single 3-hour session.', test: (data) => allSessions(data).some((session) => session.minutes >= 180) },
  { id: 'seven-nights', title: 'Seven Nights', icon: 'moon', description: 'Practise 7 days in a row.', test: (data) => longestDailyStreak(data) >= 7 },
  { id: 'juggler', title: 'Cauldron Juggler', icon: 'cauldron', description: 'Keep 3 challenges active at once.', test: (data) => data.challenges.filter((challenge) => challenge.status === 'active' && !challenge.archived).length >= 3 },
  { id: 'lazarus', title: 'Back From the Grave', icon: 'vampire', description: 'Resume a paused challenge.', test: (data) => data.challenges.some((challenge) => challenge.history.some((event, index) => event.status === 'active' && challenge.history[index - 1]?.status === 'paused')) },
  { id: 'halfway', title: 'Half-Haunted', icon: 'bat', description: 'Reach the halfway milestone in any challenge.', test: (data) => data.challenges.some((challenge) => milestonesOf(challenge).some((milestone) => milestone.title === 'Halfway there' && milestone.reachedOn)) },
  { id: 'centurion', title: 'Centurion', icon: 'pumpkin', description: 'Complete a whole challenge.', test: (data) => data.challenges.some((challenge) => challenge.status === 'completed') },
  { id: 'coven-of-skills', title: 'Coven of Skills', icon: 'mushroom', description: 'Collect 10 things you have learned.', test: (data) => data.challenges.reduce((sum, challenge) => sum + challenge.learned.length, 0) >= 10 },
  { id: 'hour-hoarder', title: 'Hour Hoarder', icon: 'spider', description: 'Invest 250 hours across all challenges.', test: (data) => data.challenges.reduce((sum, challenge) => sum + totalMinutes(challenge), 0) >= 250 * 60 },
];

export function unlockedAchievementIds(data) {
  return new Set(ACHIEVEMENTS.filter((achievement) => achievement.test(data)).map((achievement) => achievement.id));
}

export function newlyUnlocked(before, after) {
  const previous = unlockedAchievementIds(before);
  return ACHIEVEMENTS.filter((achievement) => !previous.has(achievement.id) && achievement.test(after));
}

export function reachedMilestoneKeys(data) {
  const keys = new Map();
  data.challenges.forEach((challenge) => {
    milestonesOf(challenge)
      .filter((milestone) => milestone.reachedOn)
      .forEach((milestone) => keys.set(`${challenge.id}:${milestone.id}`, `${challenge.title} · ${milestone.title}`));
  });
  return keys;
}
