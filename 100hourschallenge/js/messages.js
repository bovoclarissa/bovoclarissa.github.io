import { formatHours, pick } from './format.js';
import { remainingMinutes, visibleChallenges } from './model.js';

const GREETINGS = [
  'Another day, another questionable life decision.',
  'Your ghostly assistant is proud of you.',
  'You said you wanted to learn everything. Here we are.',
  'Progress is progress, even when it looks terrible.',
  'Boo! Did you practise today, or are we just looking at charts again?',
  'Every expert was once a disaster with good intentions.',
  'The cauldron is warm. The excuses are cold.',
  'I have been dead for 300 years and I still believe in you.',
  'Remember: ugly first attempts are a sacred tradition.',
  'Tiny sessions count. Ghosts are made of tiny things too.',
  'Mistakes are just spells with unexpected side effects.',
  'The bats asked how it is going. I said "dramatically".',
];

const NEGLECT_TEMPLATES = [
  '{title} has not seen you in {days} days. It is starting to haunt itself.',
  '{title} is gathering dust and cobwebs ({days} days). The spiders are thrilled.',
  '{days} days without {title}. Even the cat is judging you.',
  'Psst. {title} has been waiting {days} days. It left a candle in the window.',
  '{title} wrote you a letter. It says "{days} days, really?"',
];

const NEVER_STARTED_TEMPLATES = [
  '{title} has been "active" for {days} days with zero hours. Bold strategy.',
  '{title} is still waiting for its very first session ({days} days). No pressure. Some pressure.',
];

const CHALLENGE_TIPS = [
  'Log even the messy sessions. Future you loves receipts.',
  'Diary entries about failures are the best ones. I read them twice.',
  'Before and after photos: the most satisfying spell ever invented.',
  'Write down what was hard today. Tomorrow it will be slightly less hard.',
];

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

export function ghostGreeting(data) {
  const active = visibleChallenges(data).filter((challenge) => challenge.status === 'active');
  const dynamic = active.map((challenge) => {
    const left = formatHours(remainingMinutes(challenge));
    return `Only ${left} hours left on ${challenge.title}. Easy, right?`;
  });
  return pick([...GREETINGS, ...dynamic]);
}

export function challengeTip(challenge) {
  const left = formatHours(remainingMinutes(challenge));
  const contextual = challenge.status === 'completed'
    ? ['You survived 100 hours. Do you want to keep going? I will not tell anyone.']
    : [`Only ${left} hours left. Easy, right?`];
  return pick([...CHALLENGE_TIPS, ...contextual, ...GREETINGS]);
}

export function neglectMessage({ challenge, days, neverStarted }) {
  const templates = neverStarted ? NEVER_STARTED_TEMPLATES : NEGLECT_TEMPLATES;
  const index = (challenge.id.length + days) % templates.length;
  return fill(templates[index], { title: challenge.title, days });
}

export function milestoneCheer(title) {
  return pick([
    `Milestone unlocked: ${title}! The ghosts are throwing confetti (it is dust).`,
    `${title}! I knew you had it in you. Mostly.`,
    `Achievement shrieked into existence: ${title}.`,
  ]);
}
