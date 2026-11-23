import { escapeHtml, formatHours, formatPercent } from './format.js';
import { resolveImage } from './images.js';
import { STATUSES, colorFor, progressOf, totalMinutes } from './model.js';
import { icon, illustration } from './sprite.js';

export function challengeLink(challenge) {
  return `#/challenge/${encodeURIComponent(challenge.id)}`;
}

export function coverArt(challenge, className = '') {
  const accent = colorFor(challenge);
  if (challenge.cover.startsWith('svg:')) {
    return `<div class="cover cover--art ${className}" style="--accent:${accent}">${illustration(challenge.cover.slice(4))}</div>`;
  }
  return `<div class="cover ${className}" style="--accent:${accent}"><img src="${escapeHtml(resolveImage(challenge.cover))}" alt="Cover image of ${escapeHtml(challenge.title)}" loading="lazy"></div>`;
}

export function statusPill(challenge) {
  const archived = challenge.archived ? '<span class="pill pill--archived">Archived</span>' : '';
  return `<span class="pill pill--${challenge.status}">${STATUSES[challenge.status].label}</span>${archived}`;
}

export function progressBar(challenge, { size = 'regular' } = {}) {
  const ratio = progressOf(challenge);
  const minutes = totalMinutes(challenge);
  const label = `${formatHours(minutes)} of ${challenge.targetHours} hours`;
  return `
    <div class="progress progress--${size}" role="progressbar" aria-label="${escapeHtml(challenge.title)} progress" aria-valuemin="0" aria-valuemax="${challenge.targetHours}" aria-valuenow="${formatHours(minutes)}" aria-valuetext="${label}">
      <div class="progress__fill" style="width:${(ratio * 100).toFixed(2)}%;--accent:${colorFor(challenge)}"></div>
      <span class="progress__rider" style="left:${(ratio * 100).toFixed(2)}%">${illustration('ghost')}</span>
    </div>`;
}

export function hoursReadout(challenge) {
  return `<p class="hours-readout"><strong>${formatHours(totalMinutes(challenge))}</strong><span>/ ${challenge.targetHours} h</span><em>${formatPercent(progressOf(challenge))}</em></p>`;
}

export function sectionHeading({ id, title, kicker = '', art = '', actions = '' }) {
  return `
    <header class="section-heading">
      ${art ? illustration(art, 'section-heading__art') : ''}
      <div>
        ${kicker ? `<p class="kicker">${escapeHtml(kicker)}</p>` : ''}
        <h2 id="${id}">${escapeHtml(title)}</h2>
      </div>
      ${actions ? `<div class="section-heading__actions">${actions}</div>` : ''}
    </header>`;
}

export function emptyState({ art = 'ghost', title, text = '', action = '' }) {
  return `
    <div class="empty-state">
      ${illustration(art, 'empty-state__art')}
      <p class="empty-state__title">${escapeHtml(title)}</p>
      ${text ? `<p class="empty-state__text">${escapeHtml(text)}</p>` : ''}
      ${action}
    </div>`;
}

export function actionButton({ action, label, iconName = '', tone = 'ghost', data = {}, small = false, extraClass = '' }) {
  const attributes = Object.entries(data).map(([key, value]) => `data-${key}="${escapeHtml(value)}"`).join(' ');
  return `<button type="button" class="button button--${tone}${small ? ' button--small' : ''} ${extraClass}" data-action="${action}" ${attributes}>${iconName ? icon(iconName) : ''}<span>${escapeHtml(label)}</span></button>`;
}

export function photoStrip(photos, { group, tilt = true } = {}) {
  if (!photos.length) return '';
  return `<div class="photo-strip">${photos
    .map((photo, index) => `
      <button type="button" class="polaroid${tilt ? ' polaroid--tilt' : ''}" data-action="open-photo" data-group="${escapeHtml(group)}" data-index="${index}" aria-label="Open photo ${index + 1}${photo.caption ? `: ${escapeHtml(photo.caption)}` : ''}">
        <img src="${escapeHtml(resolveImage(photo.src))}" alt="${escapeHtml(photo.caption || '')}" loading="lazy">
        ${photo.caption ? `<span class="polaroid__caption">${escapeHtml(photo.caption)}</span>` : ''}
      </button>`)
    .join('')}</div>`;
}
