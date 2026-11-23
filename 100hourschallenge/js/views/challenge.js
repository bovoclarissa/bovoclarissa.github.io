import { actionButton, coverArt, emptyState, hoursReadout, photoStrip, progressBar, sectionHeading, statusPill } from '../components.js';
import { escapeHtml, formatDate, formatDuration, formatHours, formatPercent, paragraphs } from '../format.js';
import {
  RESOURCE_TYPES,
  STATUSES,
  colorFor,
  milestonesOf,
  minutesUntil,
  remainingMinutes,
  sortedDiary,
  sortedSessions,
  statsOf,
  totalMinutes,
} from '../model.js';
import { icon, illustration, scatterStickers } from '../sprite.js';

const SESSIONS_PREVIEW = 8;
const expandedSessions = new Set();

export function toggleSessionsExpanded(challengeId) {
  if (expandedSessions.has(challengeId)) expandedSessions.delete(challengeId);
  else expandedSessions.add(challengeId);
}

export function videoEmbed(url) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) {
    return `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${youtube[1]}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return `<div class="video-frame"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="Vimeo video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  return `<a class="video-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${icon('play')}<span>Watch the video</span><small>${escapeHtml(url)}</small></a>`;
}

function statusActions(challenge) {
  const buttons = [];
  const status = (next, label, iconName) => actionButton({ action: 'set-status', label, iconName, small: true, data: { challenge: challenge.id, status: next } });
  if (challenge.status === 'planned') buttons.push(status('active', 'Start', 'play'));
  if (challenge.status === 'active') buttons.push(status('paused', 'Pause', 'pause'), status('completed', 'Mark completed', 'check'));
  if (challenge.status === 'paused') buttons.push(status('active', 'Resume', 'play'), status('completed', 'Mark completed', 'check'));
  if (challenge.status === 'completed') buttons.push(status('active', 'Reopen', 'undo'));
  buttons.push(challenge.archived
    ? actionButton({ action: 'unarchive', label: 'Restore from crypt', iconName: 'undo', small: true, data: { challenge: challenge.id } })
    : actionButton({ action: 'archive', label: 'Archive', iconName: 'archive', small: true, data: { challenge: challenge.id } }));
  buttons.push(actionButton({ action: 'delete-challenge', label: 'Delete', iconName: 'trash', small: true, tone: 'danger-ghost', data: { challenge: challenge.id } }));
  return buttons.join('');
}

function heroSection(challenge, ctx) {
  const stats = statsOf(challenge);
  const reachedTarget = totalMinutes(challenge) >= challenge.targetHours * 60;
  const completionPrompt = ctx.witch && reachedTarget && challenge.status !== 'completed'
    ? `<div class="banner banner--celebrate">${illustration('cauldron', 'banner__art')}<p><strong>${challenge.targetHours} hours reached!</strong> The ritual is complete. Make it official?</p>${actionButton({ action: 'set-status', label: 'Mark as completed', iconName: 'check', tone: 'primary', data: { challenge: challenge.id, status: 'completed' } })}</div>`
    : '';
  return `
    <section class="ch-hero" style="--accent:${colorFor(challenge)}" aria-labelledby="challenge-title">
      <div class="ch-hero__cover">${coverArt(challenge, 'cover--large')}</div>
      <div class="ch-hero__info">
        <div class="challenge-card__pills">${statusPill(challenge)}${challenge.category ? `<span class="pill pill--category">${escapeHtml(challenge.category)}</span>` : ''}</div>
        <h1 id="challenge-title" class="ch-hero__title">${escapeHtml(challenge.title)}</h1>
        <p class="ch-hero__status-note">${STATUSES[challenge.status].note}</p>
        ${challenge.goal ? `<p class="ch-hero__goal"><strong>Goal</strong> ${escapeHtml(challenge.goal)}</p>` : ''}
        ${challenge.description ? `<blockquote class="handwritten">${paragraphs(challenge.description)}</blockquote>` : ''}
        ${hoursReadout(challenge)}
        ${progressBar(challenge, { size: 'large' })}
        <dl class="fact-row">
          <div><dt>Started</dt><dd>${challenge.startDate ? formatDate(challenge.startDate) : 'Not yet'}</dd></div>
          <div><dt>Hours done</dt><dd>${formatHours(stats.minutes)} h</dd></div>
          <div><dt>Hours left</dt><dd>${formatHours(remainingMinutes(challenge))} h</dd></div>
          <div><dt>Sessions</dt><dd>${stats.sessions}</dd></div>
          ${challenge.completedDate && challenge.status === 'completed' ? `<div><dt>Completed</dt><dd>${formatDate(challenge.completedDate)}</dd></div>` : ''}
        </dl>
        ${ctx.witch ? `
          <div class="ch-hero__actions">
            ${challenge.status !== 'planned' ? actionButton({ action: 'log-session', label: 'Log hours', iconName: 'clock', tone: 'primary', data: { challenge: challenge.id } }) : ''}
            ${actionButton({ action: 'new-entry', label: 'New diary entry', iconName: 'book', tone: 'secondary', data: { challenge: challenge.id } })}
            ${actionButton({ action: 'edit-challenge', label: 'Edit details', iconName: 'pen', tone: 'ghost', data: { challenge: challenge.id } })}
          </div>
          <div class="ch-hero__manage">${statusActions(challenge)}</div>` : ''}
      </div>
    </section>
    ${completionPrompt}`;
}

function milestonesSection(challenge, ctx) {
  const milestones = milestonesOf(challenge);
  const addButton = ctx.witch ? actionButton({ action: 'add-milestone', label: 'Custom milestone', iconName: 'plus', small: true, data: { challenge: challenge.id } }) : '';
  return `
    <section class="section" aria-labelledby="milestones-title">
      ${sectionHeading({ id: 'milestones-title', title: 'Milestones', kicker: 'Little trophies along the way', art: 'star', actions: addButton })}
      <ol class="milestones">
        ${milestones.map((milestone) => `
          <li class="milestone${milestone.reachedOn ? ' milestone--reached' : ''}">
            <span class="milestone__badge">${illustration(milestone.icon)}${milestone.reachedOn ? '' : `<span class="milestone__lock">${icon('lock')}</span>`}</span>
            <span class="milestone__hours">${formatHours(milestone.hours * 60)} h</span>
            <span class="milestone__title">${escapeHtml(milestone.title)}</span>
            <span class="milestone__state">${milestone.reachedOn ? `Unlocked ${formatDate(milestone.reachedOn)}` : `${formatHours(Math.max(0, milestone.hours * 60 - totalMinutes(challenge)))} h to go`}</span>
            ${milestone.description ? `<span class="milestone__description">${escapeHtml(milestone.description)}</span>` : ''}
            ${ctx.witch && milestone.custom ? `<button type="button" class="icon-button icon-button--small milestone__remove" data-action="delete-milestone" data-challenge="${escapeHtml(challenge.id)}" data-milestone="${escapeHtml(milestone.id)}" aria-label="Remove milestone ${escapeHtml(milestone.title)}">${icon('close')}</button>` : ''}
          </li>`).join('')}
      </ol>
    </section>`;
}

function diaryEntry(challenge, entry, ctx) {
  const minutesThen = minutesUntil(challenge, entry.date);
  const ratioThen = Math.min(1, minutesThen / (challenge.targetHours * 60));
  const day = entry.date.slice(8, 10);
  const month = new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' });
  return `
    <article class="entry${entry.failure ? ' entry--failure' : ''}" id="entry-${escapeHtml(entry.id)}" aria-labelledby="entry-title-${escapeHtml(entry.id)}">
      <div class="entry__stamp" aria-hidden="true"><span>${day}</span><small>${month}</small></div>
      <div class="entry__page">
        <header class="entry__header">
          <p class="entry__date">${formatDate(entry.date)}</p>
          <h3 id="entry-title-${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</h3>
          <div class="entry__progress">
            <span class="entry__hours">${icon('clock')} at ${formatHours(minutesThen)} h</span>
            <span class="mini-progress" role="img" aria-label="${formatPercent(ratioThen)} of the challenge at the time"><span style="width:${(ratioThen * 100).toFixed(1)}%;background:${colorFor(challenge)}"></span></span>
            <span class="entry__percent">${formatPercent(ratioThen)}</span>
            ${entry.failure ? `<span class="pill pill--failure">${illustration('skull')} Glorious failure</span>` : ''}
          </div>
        </header>
        <div class="entry__body prose">${paragraphs(entry.body)}</div>
        ${photoStrip(entry.photos, { group: `entry:${entry.id}` })}
        ${entry.videos.length ? `<div class="entry__videos">${entry.videos.map(videoEmbed).join('')}</div>` : ''}
        ${entry.notes ? `<aside class="sticky-note"><p class="sticky-note__label">Notes & reflections</p>${paragraphs(entry.notes)}</aside>` : ''}
        ${ctx.witch ? `
          <footer class="entry__actions">
            ${actionButton({ action: 'edit-entry', label: 'Edit', iconName: 'pen', small: true, data: { challenge: challenge.id, entry: entry.id } })}
            ${actionButton({ action: 'delete-entry', label: 'Delete', iconName: 'trash', small: true, tone: 'danger-ghost', data: { challenge: challenge.id, entry: entry.id } })}
          </footer>` : ''}
      </div>
    </article>`;
}

function diarySection(challenge, ctx) {
  const entries = sortedDiary(challenge);
  const newButton = ctx.witch ? actionButton({ action: 'new-entry', label: 'New entry', iconName: 'plus', tone: 'primary', small: true, data: { challenge: challenge.id } }) : '';
  return `
    <section class="section" aria-labelledby="diary-title">
      ${sectionHeading({ id: 'diary-title', title: 'Development Diary', kicker: 'Successes, disasters & everything in between', art: 'candle', actions: entries.length ? newButton : '' })}
      ${entries.length
        ? `<div class="diary">${entries.map((entry) => diaryEntry(challenge, entry, ctx)).join('')}</div>`
        : emptyState({ art: 'candle', title: 'The diary is still blank', text: 'The first page is always the scariest. Even if it is a disaster, especially if it is a disaster: write it down.', action: newButton })}
    </section>`;
}

function sessionsSection(challenge, ctx) {
  const sessions = sortedSessions(challenge);
  const stats = statsOf(challenge);
  const expanded = expandedSessions.has(challenge.id);
  const visible = expanded ? sessions : sessions.slice(0, SESSIONS_PREVIEW);
  const logButton = ctx.witch && challenge.status !== 'planned'
    ? actionButton({ action: 'log-session', label: 'Log session', iconName: 'plus', tone: 'primary', small: true, data: { challenge: challenge.id } })
    : '';
  const summary = sessions.length ? `
    <dl class="tracker-summary">
      <div><dt>Total</dt><dd>${formatDuration(stats.minutes)}</dd></div>
      <div><dt>Sessions</dt><dd>${stats.sessions}</dd></div>
      <div><dt>Average</dt><dd>${formatDuration(stats.averageMinutes)}</dd></div>
      <div><dt>Longest</dt><dd>${formatDuration(stats.longestMinutes)}</dd></div>
    </dl>` : '';
  const emptyText = challenge.status === 'planned' ? 'Start the experiment to begin logging hours.' : 'Zero hours so far. Every legend starts with a first, slightly awkward session.';
  return `
    <section class="section" aria-labelledby="tracker-title">
      ${sectionHeading({ id: 'tracker-title', title: 'Hour Tracker', kicker: 'Every minute counts (literally)', art: 'potion', actions: sessions.length ? logButton : '' })}
      ${sessions.length ? `
        ${summary}
        <ul class="session-list">
          ${visible.map((session) => `
            <li class="session">
              <div class="session__when"><span class="session__date">${formatDate(session.date)}</span><span class="session__duration">${formatDuration(session.minutes)}</span></div>
              <div class="session__what">
                <p>${escapeHtml(session.did)}</p>
                ${session.difficulties ? `<p class="session__extra"><strong>Struggles</strong> ${escapeHtml(session.difficulties)}</p>` : ''}
                ${session.notes ? `<p class="session__extra"><strong>Notes</strong> ${escapeHtml(session.notes)}</p>` : ''}
              </div>
              ${ctx.witch ? `
                <div class="session__actions">
                  <button type="button" class="icon-button" data-action="edit-session" data-challenge="${escapeHtml(challenge.id)}" data-session="${escapeHtml(session.id)}" aria-label="Edit session of ${formatDate(session.date)}">${icon('pen')}</button>
                  <button type="button" class="icon-button icon-button--danger" data-action="delete-session" data-challenge="${escapeHtml(challenge.id)}" data-session="${escapeHtml(session.id)}" aria-label="Delete session of ${formatDate(session.date)}">${icon('trash')}</button>
                </div>` : ''}
            </li>`).join('')}
        </ul>
        ${sessions.length > SESSIONS_PREVIEW ? `<button type="button" class="button button--ghost button--small show-more" data-action="toggle-sessions" data-challenge="${escapeHtml(challenge.id)}" aria-expanded="${expanded}">${expanded ? 'Show fewer sessions' : `Show all ${sessions.length} sessions`}</button>` : ''}`
        : emptyState({ art: 'potion', title: 'No sessions yet', text: emptyText, action: logButton })}
    </section>`;
}

function youtubeVideoId(url) {
  return url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1] || null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function resourceCard(challenge, resource, ctx) {
  const type = RESOURCE_TYPES[resource.type] || RESOURCE_TYPES.website;
  const videoId = resource.type === 'video' ? youtubeVideoId(resource.url) : null;
  return `
    <li class="resource${videoId ? ' resource--video' : ''}">
      <a class="resource__link" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
        ${videoId
          ? `<span class="resource__thumb"><img src="https://i.ytimg.com/vi/${videoId}/mqdefault.jpg" alt="" loading="lazy"><span class="resource__play">${icon('play')}</span></span>`
          : `<span class="resource__art">${illustration(type.art)}</span>`}
        <span class="resource__text">
          <span class="resource__type">${escapeHtml(type.label)}</span>
          <span class="resource__title">${escapeHtml(resource.title)}<span class="visually-hidden"> (opens in a new tab)</span></span>
          ${resource.note ? `<span class="resource__note">${escapeHtml(resource.note)}</span>` : ''}
          <span class="resource__host">${icon('link')}${escapeHtml(hostOf(resource.url))}</span>
        </span>
      </a>
      ${ctx.witch ? `
        <div class="resource__actions">
          <button type="button" class="icon-button icon-button--small" data-action="edit-resource" data-challenge="${escapeHtml(challenge.id)}" data-resource="${escapeHtml(resource.id)}" aria-label="Edit ${escapeHtml(resource.title)}">${icon('pen')}</button>
          <button type="button" class="icon-button icon-button--small icon-button--danger" data-action="delete-resource" data-challenge="${escapeHtml(challenge.id)}" data-resource="${escapeHtml(resource.id)}" aria-label="Delete ${escapeHtml(resource.title)}">${icon('trash')}</button>
        </div>` : ''}
    </li>`;
}

function resourcesSection(challenge, ctx) {
  if (!challenge.resources.length && !ctx.witch) return '';
  const typeOrder = Object.keys(RESOURCE_TYPES);
  const sorted = [...challenge.resources].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
  const addButton = ctx.witch ? actionButton({ action: 'add-resource', label: 'Add resource', iconName: 'plus', small: true, data: { challenge: challenge.id } }) : '';
  return `
    <section class="section" aria-labelledby="resources-title">
      ${sectionHeading({ id: 'resources-title', title: 'The Spellbook', kicker: 'Videos, guides & sites I learn from', art: 'potion', actions: challenge.resources.length ? addButton : '' })}
      ${sorted.length
        ? `<ul class="resource-grid">${sorted.map((resource) => resourceCard(challenge, resource, ctx)).join('')}</ul>`
        : emptyState({ art: 'moon', title: 'The spellbook is empty', text: 'Collect the videos, guides and websites that teach you something.', action: addButton })}
    </section>`;
}

function learnedSection(challenge, ctx) {
  if (!challenge.learned.length && !ctx.witch) return '';
  return `
    <section class="section" aria-labelledby="skills-title">
      ${sectionHeading({ id: 'skills-title', title: "Things I've Learned", kicker: 'Pages added to the grimoire', art: 'mushroom' })}
      ${challenge.learned.length
        ? `<ul class="skill-cloud">${challenge.learned.map((skill, index) => `
            <li><span class="skill-chip"><span class="swatch" style="background:${colorFor(challenge)}"></span>${escapeHtml(skill)}${ctx.witch ? `<button type="button" class="icon-button icon-button--tiny" data-action="remove-learned" data-challenge="${escapeHtml(challenge.id)}" data-index="${index}" aria-label="Remove ${escapeHtml(skill)}">${icon('close')}</button>` : ''}</span></li>`).join('')}</ul>`
        : '<p class="muted">Nothing here yet. Add the first skill when something finally clicks.</p>'}
      ${ctx.witch ? `
        <form class="inline-form" data-form="add-learned" data-challenge="${escapeHtml(challenge.id)}">
          <label class="visually-hidden" for="learned-input">New skill learned</label>
          <input id="learned-input" name="skill" type="text" maxlength="80" placeholder="e.g. Stretching the skin properly" autocomplete="off">
          <button type="submit" class="button button--secondary button--small">${icon('plus')}<span>Add</span></button>
        </form>` : ''}
    </section>`;
}

const DECISIONS = {
  continue: 'Yes, I am continuing beyond 100 hours',
  stop: 'No, this was enough for me',
  undecided: 'Still deciding',
};

function ratingSkulls(rating) {
  return `<span class="rating" role="img" aria-label="Rating: ${rating} out of 5">${[1, 2, 3, 4, 5].map((value) => `<span class="rating__skull${value <= rating ? ' rating__skull--on' : ''}">${illustration('skull')}</span>`).join('')}</span>`;
}

function finalSection(challenge, ctx) {
  const final = challenge.final;
  const reached = totalMinutes(challenge) >= challenge.targetHours * 60;
  const relevant = final || challenge.status === 'completed' || reached;
  if (!relevant) return '';
  const editButton = ctx.witch ? actionButton({ action: 'edit-final', label: final ? 'Edit final results' : 'Write final results', iconName: 'pen', tone: final ? 'ghost' : 'primary', small: true, data: { challenge: challenge.id } }) : '';
  if (!final) {
    return `
      <section class="section" aria-labelledby="final-title">
        ${sectionHeading({ id: 'final-title', title: 'Final Results', kicker: 'The end of the ritual', art: 'cauldron' })}
        ${emptyState({ art: 'cauldron', title: 'Final thoughts are still brewing', text: 'The verdict, the before/after and the lessons learned will appear here.', action: editButton })}
      </section>`;
  }
  const block = (label, text) => (text ? `<div class="final-block"><h3>${label}</h3><div class="prose">${paragraphs(text)}</div></div>` : '');
  return `
    <section class="section final" aria-labelledby="final-title">
      ${sectionHeading({ id: 'final-title', title: 'Final Results', kicker: 'The end of the ritual', art: 'cauldron', actions: editButton })}
      ${final.result ? `<div class="final__verdict prose">${paragraphs(final.result)}</div>` : ''}
      ${final.beforePhotos?.length || final.afterPhotos?.length ? `
        <div class="before-after">
          <div><h3>Before</h3>${final.beforePhotos?.length ? photoStrip(final.beforePhotos, { group: 'final-before' }) : '<p class="muted">No before photos.</p>'}</div>
          <div><h3>After</h3>${final.afterPhotos?.length ? photoStrip(final.afterPhotos, { group: 'final-after' }) : '<p class="muted">No after photos.</p>'}</div>
        </div>` : ''}
      <div class="final-grid">
        ${block('What I learned', final.learned)}
        ${block('The hardest part', final.hardest)}
        ${block('What I loved', final.liked)}
      </div>
      <div class="final__footer">
        ${final.rating ? `<div><h3>Personal rating</h3>${ratingSkulls(final.rating)}</div>` : ''}
        ${final.decision ? `<div><h3>Beyond 100 hours?</h3><p>${DECISIONS[final.decision] || ''}</p></div>` : ''}
      </div>
    </section>`;
}

export function renderChallenge(challenge, ctx) {
  const finalFirst = challenge.status === 'completed';
  return `
    <div class="page page--challenge" style="--accent:${colorFor(challenge)}">
      <div class="floating-stickers" aria-hidden="true">${scatterStickers(challenge.id, 6)}</div>
      <a class="back-link" href="#/">${icon('back')}<span>Back to the lab</span></a>
      ${heroSection(challenge, ctx)}
      ${finalFirst ? finalSection(challenge, ctx) : ''}
      ${milestonesSection(challenge, ctx)}
      ${diarySection(challenge, ctx)}
      ${sessionsSection(challenge, ctx)}
      ${resourcesSection(challenge, ctx)}
      ${learnedSection(challenge, ctx)}
      ${finalFirst ? '' : finalSection(challenge, ctx)}
    </div>`;
}

export function renderNotFound() {
  return `
    <div class="page">
      ${emptyState({ art: 'ghost', title: 'This experiment vanished', text: 'It may have been deleted, or it only exists in another dimension (or another browser).', action: '<a class="button button--primary" href="#/">Back to the lab</a>' })}
    </div>`;
}

export const FINAL_DECISIONS = DECISIONS;
