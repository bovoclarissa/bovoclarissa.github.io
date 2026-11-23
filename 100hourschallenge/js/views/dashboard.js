import { ACHIEVEMENTS, unlockedAchievementIds } from '../achievements.js';
import { buildJourneySeries, drawJourneyChart, progressRing, rhythmLevel, weeklyRhythm } from '../charts.js';
import { actionButton, challengeLink, coverArt, emptyState, hoursReadout, progressBar, sectionHeading, statusPill } from '../components.js';
import { escapeHtml, formatDate, formatDuration, formatHours, formatPercent, formatShortDate, relativeDay } from '../format.js';
import { ghostGreeting, neglectMessage } from '../messages.js';
import {
  MAX_COMPARED,
  STATUSES,
  assignComparisonColors,
  colorFor,
  currentObsession,
  lastActivity,
  learningStyle,
  neglectedChallenges,
  overviewOf,
  progressOf,
  statsOf,
  totalMinutes,
  visibleChallenges,
} from '../model.js';
import { icon, illustration, scatterStickers } from '../sprite.js';

const COMPARE_KEY = 'hundred-hours:compare';
const RHYTHM_WEEKS = 12;

function readCompareState() {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveCompareState(next) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify({ ...readCompareState(), ...next }));
  } catch {
    return;
  }
}

function comparableChallenges(data) {
  return visibleChallenges(data).filter((challenge) => challenge.startDate && challenge.status !== 'planned');
}

function selectedForComparison(data) {
  const comparable = comparableChallenges(data);
  const saved = readCompareState().selected;
  const chosen = Array.isArray(saved) ? comparable.filter((challenge) => saved.includes(challenge.id)) : [];
  if (chosen.length) return chosen.slice(0, MAX_COMPARED);
  const active = comparable.filter((challenge) => challenge.status === 'active');
  return (active.length ? active : comparable).slice(0, MAX_COMPARED);
}

function heroSection(data) {
  return `
    <section class="hero" aria-labelledby="hero-title">
      ${illustration('web', 'hero__web hero__web--left')}
      ${illustration('web', 'hero__web hero__web--right')}
      <div class="hero__text">
        <p class="kicker">A personal laboratory of questionable experiments</p>
        <h1 id="hero-title" class="hero__title">The 100 Hours Project</h1>
        <p class="hero__subtitle">100 hours. New skills. Endless experiments.</p>
        <p class="hero__description">One rule: pick something I know nothing about, give it 100 real hours, and document everything. The progress, the mess, the burnt potions and the tiny victories.</p>
      </div>
      <div class="hero__art">
        <span class="hero__spider">${illustration('spider')}</span>
        ${illustration('cauldron', 'hero__cauldron')}
        <figure class="ghost-note">
          ${illustration('ghost', 'ghost-note__ghost')}
          <blockquote><p>${escapeHtml(ghostGreeting(data))}</p></blockquote>
          <figcaption>— Boo, resident ghost</figcaption>
        </figure>
      </div>
    </section>`;
}

function overviewSection(data) {
  const overview = overviewOf(data);
  const tiles = [
    { label: 'Active experiments', value: overview.active, art: 'potion' },
    { label: 'Completed', value: overview.completed, art: 'skull' },
    { label: 'Hours invested', value: formatHours(overview.investedMinutes), art: 'candle' },
    { label: 'Hours still to go', value: formatHours(overview.remainingMinutes), art: 'moon' },
    { label: 'Overall completion', value: formatPercent(overview.completion), art: 'star' },
  ];
  return `
    <section class="overview" aria-label="Overview">
      ${tiles.map((tile) => `
        <div class="stat-tile">
          ${illustration(tile.art, 'stat-tile__art')}
          <p class="stat-tile__value">${tile.value}</p>
          <p class="stat-tile__label">${tile.label}</p>
        </div>`).join('')}
    </section>`;
}

function obsessionSection(data) {
  const obsession = currentObsession(data);
  const neglected = neglectedChallenges(data, data.settings.neglectDays);
  const obsessionHtml = obsession
    ? `<a class="obsession__link" href="${challengeLink(obsession.challenge)}"><span class="swatch" style="background:${colorFor(obsession.challenge)}"></span>${escapeHtml(obsession.challenge.title)}</a>
       <span class="obsession__meta">${formatDuration(obsession.recentMinutes)} in the last 14 days</span>`
    : '<span class="obsession__meta">Nothing yet. The cauldron is cold and waiting for a first session.</span>';
  return `
    <section class="obsession" aria-label="Current focus">
      <div class="obsession__card">
        ${illustration('crystal', 'obsession__art')}
        <div>
          <p class="kicker">Currently obsessed with…</p>
          <p class="obsession__value">${obsessionHtml}</p>
        </div>
      </div>
      ${neglected.length ? `
        <ul class="neglect-list" aria-label="Neglected experiments">
          ${neglected.map((item) => `
            <li class="neglect">
              ${illustration('spider', 'neglect__art')}
              <p>${escapeHtml(neglectMessage(item))}</p>
              <a class="button button--small button--ghost" href="${challengeLink(item.challenge)}">Visit it</a>
            </li>`).join('')}
        </ul>` : ''}
    </section>`;
}

function challengeCard(challenge, ctx) {
  const last = lastActivity(challenge);
  return `
    <article class="challenge-card" style="--accent:${colorFor(challenge)}">
      <a href="${challengeLink(challenge)}" class="challenge-card__cover" tabindex="-1" aria-hidden="true">${coverArt(challenge)}</a>
      <div class="challenge-card__body">
        <div class="challenge-card__pills">${statusPill(challenge)}${challenge.category ? `<span class="pill pill--category">${escapeHtml(challenge.category)}</span>` : ''}</div>
        <h3 class="challenge-card__title"><a href="${challengeLink(challenge)}">${escapeHtml(challenge.title)}</a></h3>
        <p class="challenge-card__description">${escapeHtml(challenge.goal || challenge.description)}</p>
        ${hoursReadout(challenge)}
        ${progressBar(challenge)}
        <dl class="challenge-card__meta">
          <div><dt>Started</dt><dd>${challenge.startDate ? formatDate(challenge.startDate) : 'Not yet'}</dd></div>
          <div><dt>Last update</dt><dd>${last ? relativeDay(last) : 'No updates yet'}</dd></div>
        </dl>
        <div class="challenge-card__actions">
          <a class="button button--secondary" href="${challengeLink(challenge)}">${icon('book')}<span>Open diary</span></a>
          ${ctx.witch && challenge.status !== 'planned' ? actionButton({ action: 'log-session', label: 'Log hours', iconName: 'clock', tone: 'primary', data: { challenge: challenge.id } }) : ''}
          ${ctx.witch && challenge.status === 'planned' ? actionButton({ action: 'set-status', label: 'Start it', iconName: 'play', tone: 'primary', data: { challenge: challenge.id, status: 'active' } }) : ''}
        </div>
      </div>
    </article>`;
}

function activeSection(data, ctx) {
  const active = visibleChallenges(data).filter((challenge) => challenge.status === 'active');
  const newButton = ctx.witch ? actionButton({ action: 'new-challenge', label: 'New experiment', iconName: 'plus', tone: 'primary' }) : '';
  const body = active.length
    ? `<div class="card-grid">${active.map((challenge) => challengeCard(challenge, ctx)).join('')}</div>`
    : emptyState({ art: 'cauldron', title: 'No active experiments', text: 'The lab is suspiciously quiet. Start something questionable.', action: newButton });
  return `
    <section class="section" aria-labelledby="active-title">
      ${sectionHeading({ id: 'active-title', title: 'Active Experiments', kicker: 'Bubbling right now', art: 'potion', actions: active.length ? newButton : '' })}
      ${body}
    </section>`;
}

function waitingSection(data, ctx) {
  const waiting = visibleChallenges(data).filter((challenge) => challenge.status === 'planned' || challenge.status === 'paused');
  if (!waiting.length) return '';
  return `
    <section class="section" aria-labelledby="waiting-title">
      ${sectionHeading({ id: 'waiting-title', title: 'In the Cauldron', kicker: 'Planned & paused', art: 'cat' })}
      <div class="card-grid card-grid--compact">${waiting.map((challenge) => challengeCard(challenge, ctx)).join('')}</div>
    </section>`;
}

function comparisonSection(data) {
  const comparable = comparableChallenges(data);
  const intro = 'Different journeys, side by side. Not a race: every experiment is measured against its own 100 hours.';
  if (!comparable.length) {
    return `
      <section class="section" aria-labelledby="compare-title">
        ${sectionHeading({ id: 'compare-title', title: 'Comparison', kicker: 'The lab notebook', art: 'crystal' })}
        ${emptyState({ art: 'crystal', title: 'Nothing to compare yet', text: 'Start an experiment and the crystal ball will begin to glow.' })}
      </section>`;
  }
  const selected = selectedForComparison(data);
  const colors = assignComparisonColors(selected);
  const mode = readCompareState().mode === 'calendar' ? 'calendar' : 'journey';
  const totalSessions = selected.reduce((sum, challenge) => sum + challenge.sessions.length, 0);
  const chips = comparable.map((challenge) => {
    const isOn = selected.some((item) => item.id === challenge.id);
    const disabled = !isOn && selected.length >= MAX_COMPARED;
    return `<button type="button" class="chip" data-action="toggle-compare" data-challenge="${escapeHtml(challenge.id)}" aria-pressed="${isOn}" ${disabled ? 'disabled title="You can compare up to 4 experiments at once"' : ''}>
      ${isOn ? `<span class="swatch" style="background:${colors.get(challenge.id)}"></span>` : ''}${escapeHtml(challenge.title)}</button>`;
  }).join('');

  const rings = selected.map((challenge) => {
    const ratio = progressOf(challenge);
    const stats = statsOf(challenge);
    return `
      <div class="ring-card">
        <div class="ring-card__ring">
          ${progressRing(ratio, colors.get(challenge.id), { label: `${challenge.title}: ${formatPercent(ratio)} complete` })}
          <span class="ring-card__value">${formatPercent(ratio)}</span>
        </div>
        <p class="ring-card__title"><span class="swatch" style="background:${colors.get(challenge.id)}"></span>${escapeHtml(challenge.title)}</p>
        <p class="ring-card__meta">${formatHours(stats.minutes)} / ${challenge.targetHours} h · ${STATUSES[challenge.status].label}</p>
      </div>`;
  }).join('');

  const rhythmRows = selected.map((challenge) => {
    const weeks = weeklyRhythm(challenge, RHYTHM_WEEKS);
    return `
      <div class="rhythm__row">
        <span class="rhythm__label"><span class="swatch" style="background:${colors.get(challenge.id)}"></span>${escapeHtml(challenge.title)}</span>
        <span class="rhythm__cells">${weeks.map((week) => `<span class="rhythm__cell rhythm__cell--l${rhythmLevel(week.minutes)}" style="--accent:${colors.get(challenge.id)}" data-tip="${escapeHtml(`${challenge.title} · week of ${formatShortDate(week.week)}: ${week.minutes ? formatDuration(week.minutes) : 'no sessions'}`)}"></span>`).join('')}</span>
      </div>`;
  }).join('');

  const rows = [
    ['Hours logged', (stats) => `${formatHours(stats.minutes)} h`],
    ['Completion', (stats, challenge) => formatPercent(progressOf(challenge))],
    ['Sessions', (stats) => stats.sessions],
    ['Average session', (stats) => (stats.sessions ? formatDuration(stats.averageMinutes) : '—')],
    ['Longest session', (stats) => (stats.sessions ? formatDuration(stats.longestMinutes) : '—')],
    ['Pace', (stats) => (stats.sessions ? `${stats.hoursPerWeek.toFixed(1)} h / week` : '—')],
    ['Days on the journey', (stats) => stats.journeyDays],
    ['Last session', (stats) => (stats.daysSinceLastSession === null ? 'never' : stats.daysSinceLastSession === 0 ? 'today' : `${stats.daysSinceLastSession} d ago`)],
    ['Learning style', (stats) => learningStyle(stats).label],
  ];
  const statsById = new Map(selected.map((challenge) => [challenge.id, statsOf(challenge)]));
  const table = `
    <div class="table-scroll">
      <table class="compare-table">
        <caption class="visually-hidden">Comparison of the selected experiments</caption>
        <thead><tr><th scope="col">Metric</th>${selected.map((challenge) => `<th scope="col"><span class="swatch" style="background:${colors.get(challenge.id)}"></span>${escapeHtml(challenge.title)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(([label, read]) => `<tr><th scope="row">${label}</th>${selected.map((challenge) => `<td>${read(statsById.get(challenge.id), challenge)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;

  return `
    <section class="section" aria-labelledby="compare-title">
      ${sectionHeading({ id: 'compare-title', title: 'Comparison', kicker: 'The lab notebook', art: 'crystal' })}
      <p class="section-intro">${intro}</p>
      <div class="chip-row" role="group" aria-label="Experiments to compare">${chips}</div>
      <div class="compare-grid">
        <div class="panel panel--wide">
          <div class="panel__header">
            <h3>Progress over time</h3>
            <div class="segmented" role="group" aria-label="Time axis">
              <button type="button" data-action="compare-mode" data-mode="journey" aria-pressed="${mode === 'journey'}">Day of journey</button>
              <button type="button" data-action="compare-mode" data-mode="calendar" aria-pressed="${mode === 'calendar'}">Calendar</button>
            </div>
          </div>
          <div class="chart-legend">${selected.map((challenge) => `<span><span class="swatch" style="background:${colors.get(challenge.id)}"></span>${escapeHtml(challenge.title)}</span>`).join('')}</div>
          ${totalSessions
            ? `<div class="chart-frame" data-journey-chart data-mode="${mode}"></div><p class="chart-note">${mode === 'journey' ? 'Every line starts at its own day one, so different start dates stay comparable.' : 'Real calendar dates, to see which experiments overlap.'}</p>`
            : emptyState({ art: 'ghost', title: 'No sessions logged yet', text: 'The graph is waiting to be haunted by your first hours.' })}
        </div>
        <div class="panel">
          <h3>Completion, each on its own scale</h3>
          <div class="ring-row">${rings}</div>
        </div>
        <div class="panel">
          <h3>Weekly rhythm <small>(last ${RHYTHM_WEEKS} weeks)</small></h3>
          <div class="rhythm" data-tip-root>${rhythmRows}</div>
          <div class="rhythm-legend" aria-hidden="true"><span>less</span>${[0, 1, 2, 3, 4].map((level) => `<span class="rhythm__cell rhythm__cell--l${level}" style="--accent:var(--lavender)"></span>`).join('')}<span>more</span></div>
          <p class="chart-note">Empty · under 2h · 2–5h · 5–10h · 10h+ per week</p>
        </div>
        <div class="panel panel--wide">
          <h3>Side by side</h3>
          ${table}
        </div>
      </div>
    </section>`;
}

function completedSection(data) {
  const completed = visibleChallenges(data).filter((challenge) => challenge.status === 'completed');
  const body = completed.length
    ? `<div class="card-grid">${completed.map((challenge) => {
      const finalPhoto = challenge.final?.afterPhotos?.[0];
      const art = finalPhoto ? coverArt({ ...challenge, cover: finalPhoto.src }) : coverArt(challenge);
      return `
        <article class="trophy-card" style="--accent:${colorFor(challenge)}">
          <div class="trophy-card__cover">${art}${illustration('star', 'trophy-card__star')}</div>
          <div class="trophy-card__body">
            <h3><a href="${challengeLink(challenge)}">${escapeHtml(challenge.title)}</a></h3>
            <dl class="challenge-card__meta">
              <div><dt>Hours</dt><dd>${formatHours(totalMinutes(challenge))} h</dd></div>
              <div><dt>Completed</dt><dd>${formatDate(challenge.completedDate)}</dd></div>
            </dl>
            <p class="trophy-card__result">${escapeHtml(challenge.final?.result || 'Final verdict still being written in blood (ink).')}</p>
            <a class="button button--secondary" href="${challengeLink(challenge)}">${icon('book')}<span>Read the full diary</span></a>
          </div>
        </article>`;
    }).join('')}</div>`
    : emptyState({ art: 'skull', title: 'No completed experiments yet', text: 'The trophy shelf is empty, but the skull is patient.' });
  return `
    <section class="section" aria-labelledby="completed-title">
      ${sectionHeading({ id: 'completed-title', title: 'Completed Experiments', kicker: 'Survived 100 hours', art: 'skull' })}
      ${body}
    </section>`;
}

function learnedSection(data) {
  const items = data.challenges.flatMap((challenge) => challenge.learned.map((skill) => ({ skill, challenge })));
  return `
    <section class="section" aria-labelledby="learned-title">
      ${sectionHeading({ id: 'learned-title', title: "Things I've Learned", kicker: 'The growing grimoire', art: 'mushroom' })}
      ${items.length
        ? `<ul class="skill-cloud">${items.map(({ skill, challenge }) => `<li><a href="${challengeLink(challenge)}" title="${escapeHtml(challenge.title)}"><span class="swatch" style="background:${colorFor(challenge)}"></span>${escapeHtml(skill)}</a></li>`).join('')}</ul>`
        : emptyState({ art: 'mushroom', title: 'Nothing learned yet', text: 'Which is completely fine. Probably. Add skills from each experiment page.' })}
    </section>`;
}

function achievementsSection(data) {
  const unlocked = unlockedAchievementIds(data);
  return `
    <section class="section" aria-labelledby="achievements-title">
      ${sectionHeading({ id: 'achievements-title', title: 'Achievements', kicker: `${unlocked.size} of ${ACHIEVEMENTS.length} unlocked`, art: 'star' })}
      <ul class="achievement-grid">
        ${ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id);
          return `
            <li class="achievement${isUnlocked ? ' achievement--unlocked' : ''}">
              <span class="achievement__badge">${illustration(achievement.icon)}${isUnlocked ? '' : `<span class="achievement__lock">${icon('lock')}</span>`}</span>
              <span class="achievement__title">${escapeHtml(achievement.title)}<span class="visually-hidden">${isUnlocked ? ' (unlocked)' : ' (locked)'}</span></span>
              <span class="achievement__description">${escapeHtml(achievement.description)}</span>
            </li>`;
        }).join('')}
      </ul>
    </section>`;
}

function archiveSection(data, ctx) {
  const archived = data.challenges.filter((challenge) => challenge.archived);
  if (!archived.length) return '';
  return `
    <section class="section" aria-labelledby="archive-title">
      <details class="archive">
        <summary>${illustration('spider', 'archive__art')}<span id="archive-title">The Crypt</span><small>${archived.length} archived experiment${archived.length > 1 ? 's' : ''}</small></summary>
        <ul class="archive__list">
          ${archived.map((challenge) => `
            <li>
              <a href="${challengeLink(challenge)}">${escapeHtml(challenge.title)}</a>
              <span>${statusPill({ ...challenge, archived: false })}</span>
              <span>${formatHours(totalMinutes(challenge))} h</span>
              ${ctx.witch ? actionButton({ action: 'unarchive', label: 'Restore', iconName: 'undo', small: true, data: { challenge: challenge.id } }) : ''}
            </li>`).join('')}
        </ul>
      </details>
    </section>`;
}

export function renderDashboard(ctx) {
  const { data } = ctx;
  return `
    <div class="page page--dashboard">
      <div class="floating-stickers" aria-hidden="true">${scatterStickers('dashboard', 8)}</div>
      ${heroSection(data)}
      ${overviewSection(data)}
      ${obsessionSection(data)}
      ${activeSection(data, ctx)}
      ${comparisonSection(data)}
      ${waitingSection(data, ctx)}
      ${completedSection(data)}
      ${learnedSection(data)}
      ${achievementsSection(data)}
      ${archiveSection(data, ctx)}
    </div>`;
}

export function mountDashboard(root, ctx) {
  const frame = root.querySelector('[data-journey-chart]');
  if (!frame) return () => {};
  const selected = selectedForComparison(ctx.data);
  const colors = assignComparisonColors(selected);
  const mode = frame.dataset.mode;
  const series = buildJourneySeries(selected, colors, mode);
  let lastWidth = 0;
  const draw = () => {
    if (frame.clientWidth === lastWidth) return;
    lastWidth = frame.clientWidth;
    drawJourneyChart(frame, series, mode);
  };
  draw();
  const observer = new ResizeObserver(draw);
  observer.observe(frame);
  return () => observer.disconnect();
}

export function toggleCompared(data, id) {
  const current = selectedForComparison(data).map((challenge) => challenge.id);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, MAX_COMPARED);
  if (!next.length) return false;
  saveCompareState({ selected: next });
  return true;
}
