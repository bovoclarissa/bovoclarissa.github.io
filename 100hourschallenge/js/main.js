import { commit, openChallengeForm, openEntryForm, openFinalForm, openMilestoneForm, openResourceForm, openSessionForm } from './forms.js';
import { escapeHtml, formatHours, todayIso } from './format.js';
import { preloadPendingImages } from './images.js';
import { challengeTip, ghostGreeting } from './messages.js';
import { totalMinutes } from './model.js';
import { icon, illustration, injectSprite } from './sprite.js';
import { buildExportArchive, discardDraft, draftStatus, findChallenge, getData, loadData, subscribe } from './store.js';
import { confirmAction, downloadBlob, initMascot, openLightbox, openModal, setMascotContext, toast } from './ui.js';
import { renderChallenge, renderNotFound, toggleSessionsExpanded } from './views/challenge.js';
import { mountDashboard, renderDashboard, saveCompareState, toggleCompared } from './views/dashboard.js';

const WITCH_KEY = 'hundred-hours:witch';
const app = document.getElementById('app');
let unmountView = () => {};
let lastRouteKey = '';

function isWitch() {
  try {
    return localStorage.getItem(WITCH_KEY) === '1';
  } catch {
    return false;
  }
}

function setWitch(enabled) {
  try {
    if (enabled) localStorage.setItem(WITCH_KEY, '1');
    else localStorage.removeItem(WITCH_KEY);
  } catch {
    toast('Your browser blocked local storage, so witch mode cannot be remembered.', { tone: 'error' });
  }
}

function parseRoute() {
  const [section, id] = location.hash.replace(/^#\/?/, '').split('/');
  if (section === 'witch') return { name: 'witch' };
  if (section === 'challenge' && id) return { name: 'challenge', id: decodeURIComponent(id) };
  return { name: 'dashboard' };
}

function renderWitchBar() {
  const bar = document.getElementById('witch-bar');
  if (!isWitch()) {
    bar.hidden = true;
    bar.innerHTML = '';
    document.body.classList.remove('is-witch');
    return;
  }
  document.body.classList.add('is-witch');
  const status = draftStatus();
  let message = 'Everything is published. Add something new!';
  if (status.hasDraft && status.dirty) message = `${status.changes} unpublished change${status.changes === 1 ? '' : 's'}, saved in this browser.`;
  if (status.hasDraft && status.awaitingUpload) message = 'Exported. Upload the zip to GitHub and this note disappears once the site updates.';
  bar.hidden = false;
  bar.innerHTML = `
    <div class="witch-bar__inner">
      <span class="witch-bar__label">${illustration('crystal')}<strong>Witch mode</strong></span>
      <p class="witch-bar__message">${escapeHtml(message)}${status.conflict ? ' <strong>Heads up: the published data changed since you started editing here.</strong>' : ''}</p>
      <div class="witch-bar__actions">
        <button type="button" class="button button--small button--ghost" data-action="new-challenge">${icon('plus')}<span>New</span></button>
        ${status.hasDraft ? `<button type="button" class="button button--small button--primary" data-action="export">${icon('download')}<span>${status.awaitingUpload ? 'Download again' : 'Export & publish'}</span></button>` : ''}
        ${status.hasDraft ? `<button type="button" class="button button--small button--ghost" data-action="discard-draft">${icon('undo')}<span>Discard</span></button>` : ''}
        <button type="button" class="button button--small button--ghost" data-action="leave-witch">${icon('exit')}<span>Leave</span></button>
      </div>
    </div>`;
}

function render() {
  const route = parseRoute();
  if (route.name === 'witch') {
    setWitch(true);
    toast('Witch mode on. Your edits are saved in this browser until you export them.', { tone: 'achievement', art: 'crystal' });
    location.replace('#/');
    return;
  }
  const ctx = { data: getData(), witch: isWitch() };
  const routeKey = route.name === 'challenge' ? `challenge:${route.id}` : 'dashboard';
  const scrollY = window.scrollY;
  unmountView();
  unmountView = () => {};
  if (route.name === 'challenge') {
    const challenge = findChallenge(route.id);
    app.innerHTML = challenge ? renderChallenge(challenge, ctx) : renderNotFound();
    document.title = challenge ? `${challenge.title} · The 100 Hours Project` : 'Lost experiment · The 100 Hours Project';
    setMascotContext(() => (challenge ? challengeTip(challenge) : 'Boo. This page is empty, like my social calendar.'));
  } else {
    app.innerHTML = renderDashboard(ctx);
    document.title = 'The 100 Hours Project';
    unmountView = mountDashboard(app, ctx);
    setMascotContext(() => ghostGreeting(getData()));
  }
  renderWitchBar();
  if (routeKey !== lastRouteKey) {
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, scrollY);
  }
  lastRouteKey = routeKey;
}

function photosForGroup(challenge, group) {
  if (group.startsWith('entry:')) return challenge.diary.find((entry) => entry.id === group.slice(6))?.photos || [];
  if (group === 'final-before') return challenge.final?.beforePhotos || [];
  if (group === 'final-after') return challenge.final?.afterPhotos || [];
  return [];
}

async function setStatus(challengeId, status) {
  const challenge = findChallenge(challengeId);
  const today = todayIso();
  if (status === 'completed' && totalMinutes(challenge) < challenge.targetHours * 60) {
    const confirmed = await confirmAction({
      title: 'Complete it early?',
      message: `${challenge.title} has ${formatHours(totalMinutes(challenge))} of ${challenge.targetHours} hours. Mark it as completed anyway?`,
      confirmLabel: 'Yes, it is done',
      tone: 'primary',
    });
    if (!confirmed) return;
  }
  const messages = {
    active: challenge.status === 'paused' ? 'Back from the grave! Experiment resumed.' : challenge.status === 'completed' ? 'Experiment reopened. Beyond 100 hours we go.' : 'Experiment started. Good luck, brave witch.',
    paused: 'Experiment paused. It is napping in its coffin.',
    completed: 'Challenge completed! The skull is crying tears of joy.',
  };
  commit((data) => {
    const target = data.challenges.find((item) => item.id === challengeId);
    target.status = status;
    if (status === 'active' && !target.startDate) target.startDate = today;
    if (status === 'completed') target.completedDate = today;
    if (status === 'active') target.completedDate = null;
    target.history.push({ status, date: today });
  }, messages[status]);
}

function openExportDialog() {
  const status = draftStatus();
  openModal({
    title: 'Export & publish',
    body: `
      <div class="export-steps">
        <p>Your changes live only in this browser until you publish them. Here is the ritual:</p>
        <ol>
          <li><strong>Download</strong> the zip with the button below.</li>
          <li><strong>Unzip it inside the <code>100hourschallenge</code> folder</strong> of your GitHub Pages repository. It contains <code>data/challenges.json</code> and any new photos in <code>uploads/</code>; let it overwrite the old JSON.</li>
          <li><strong>Commit & push</strong> (or drag the files into the GitHub web uploader).</li>
          <li>When GitHub Pages finishes updating, reload this page: the draft is cleared automatically.</li>
        </ol>
        ${status.conflict ? '<p class="banner banner--warning">The published data has changed since you started editing in this browser (maybe from another device). Exporting will overwrite it with this version.</p>' : ''}
      </div>`,
    submitLabel: 'Download zip',
    onSubmit: async () => {
      const { archive, imageCount, revision } = await buildExportArchive();
      downloadBlob(archive, `100-hours-update-${todayIso()}-r${revision}.zip`);
      toast(`Zip ready with the data${imageCount ? ` and ${imageCount} photo${imageCount === 1 ? '' : 's'}` : ''}. Now upload it to GitHub!`, { tone: 'achievement', art: 'potion', duration: 7000 });
      return null;
    },
  });
}

const ACTIONS = {
  'new-challenge': () => openChallengeForm(),
  'edit-challenge': ({ challenge }) => openChallengeForm(findChallenge(challenge)),
  'set-status': ({ challenge, status }) => setStatus(challenge, status),
  archive: async ({ challenge }) => {
    const target = findChallenge(challenge);
    const confirmed = await confirmAction({ title: 'Send it to the crypt?', message: `${target.title} will be hidden from the dashboard. You can restore it anytime from "The Crypt".`, confirmLabel: 'Archive', tone: 'primary' });
    if (confirmed) commit((data) => { data.challenges.find((item) => item.id === challenge).archived = true; }, 'Archived. Resting peacefully in the crypt.');
  },
  unarchive: ({ challenge }) => commit((data) => { data.challenges.find((item) => item.id === challenge).archived = false; }, 'Restored from the crypt!'),
  'delete-challenge': async ({ challenge }) => {
    const target = findChallenge(challenge);
    const confirmed = await confirmAction({ title: 'Delete forever?', message: `This deletes ${target.title} with all its sessions and diary entries. Archiving is the gentler option. This cannot be undone after you publish.`, confirmLabel: 'Delete forever' });
    if (!confirmed) return;
    commit((data) => { data.challenges = data.challenges.filter((item) => item.id !== challenge); }, 'Experiment deleted. Rest in pieces.');
    location.hash = '#/';
  },
  'log-session': ({ challenge }) => openSessionForm(challenge),
  'edit-session': ({ challenge, session }) => openSessionForm(challenge, session),
  'delete-session': async ({ challenge, session }) => {
    const confirmed = await confirmAction({ title: 'Delete this session?', message: 'The hours of this session will be removed from the total.', confirmLabel: 'Delete session' });
    if (confirmed) commit((data) => {
      const target = data.challenges.find((item) => item.id === challenge);
      target.sessions = target.sessions.filter((item) => item.id !== session);
    }, 'Session deleted.');
  },
  'toggle-sessions': ({ challenge }) => {
    toggleSessionsExpanded(challenge);
    render();
  },
  'new-entry': ({ challenge }) => openEntryForm(challenge),
  'edit-entry': ({ challenge, entry }) => openEntryForm(challenge, entry),
  'delete-entry': async ({ challenge, entry }) => {
    const confirmed = await confirmAction({ title: 'Delete this diary entry?', message: 'The text, photos and links of this entry will disappear from the diary.', confirmLabel: 'Delete entry' });
    if (confirmed) commit((data) => {
      const target = data.challenges.find((item) => item.id === challenge);
      target.diary = target.diary.filter((item) => item.id !== entry);
    }, 'Diary entry deleted.');
  },
  'add-milestone': ({ challenge }) => openMilestoneForm(challenge),
  'delete-milestone': ({ challenge, milestone }) => commit((data) => {
    const target = data.challenges.find((item) => item.id === challenge);
    target.customMilestones = target.customMilestones.filter((item) => item.id !== milestone);
  }, 'Milestone removed.'),
  'edit-final': ({ challenge }) => openFinalForm(challenge),
  'add-resource': ({ challenge }) => openResourceForm(challenge),
  'edit-resource': ({ challenge, resource }) => openResourceForm(challenge, resource),
  'delete-resource': async ({ challenge, resource }) => {
    const confirmed = await confirmAction({ title: 'Remove this resource?', message: 'It will disappear from the spellbook of this experiment.', confirmLabel: 'Remove' });
    if (confirmed) commit((data) => {
      const target = data.challenges.find((item) => item.id === challenge);
      target.resources = target.resources.filter((item) => item.id !== resource);
    }, 'Resource removed.');
  },
  'remove-learned': ({ challenge, index }) => commit((data) => {
    data.challenges.find((item) => item.id === challenge).learned.splice(Number(index), 1);
  }, 'Removed from the grimoire.'),
  'open-photo': ({ group, index }) => {
    const challenge = findChallenge(parseRoute().id);
    const photos = challenge ? photosForGroup(challenge, group) : [];
    if (photos.length) openLightbox(photos, Number(index));
  },
  'toggle-compare': ({ challenge }) => {
    if (toggleCompared(getData(), challenge)) render();
    else toast('Keep at least one experiment in the comparison.', { tone: 'info' });
  },
  'compare-mode': ({ mode }) => {
    saveCompareState({ mode });
    render();
  },
  export: () => openExportDialog(),
  'discard-draft': async () => {
    const confirmed = await confirmAction({ title: 'Discard local changes?', message: 'Everything you changed in this browser since the last published version will be lost, including new photos.', confirmLabel: 'Discard changes' });
    if (!confirmed) return;
    await discardDraft();
    toast('Local changes discarded. Back to the published version.', { tone: 'info' });
  },
  'leave-witch': () => {
    setWitch(false);
    render();
    toast('Witch mode off. Visit #/witch to come back.', { tone: 'info' });
  },
};

function handleClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger || trigger.disabled) return;
  const handler = ACTIONS[trigger.dataset.action];
  if (!handler) return;
  event.preventDefault();
  Promise.resolve(handler({ ...trigger.dataset })).catch((error) => toast(error.message || 'Something went wrong.', { tone: 'error' }));
}

function handleSubmit(event) {
  const form = event.target.closest('[data-form="add-learned"]');
  if (!form) return;
  event.preventDefault();
  const input = form.elements.skill;
  const skill = input.value.trim();
  if (!skill) {
    input.setAttribute('aria-invalid', 'true');
    toast('Type what you learned first.', { tone: 'error' });
    return;
  }
  const challengeId = form.dataset.challenge;
  if (findChallenge(challengeId).learned.some((item) => item.toLowerCase() === skill.toLowerCase())) {
    toast('That one is already in the grimoire.', { tone: 'info' });
    return;
  }
  try {
    commit((data) => { data.challenges.find((item) => item.id === challengeId).learned.push(skill.slice(0, 80)); }, 'Added to the grimoire.');
    document.getElementById('learned-input')?.focus();
  } catch (error) {
    toast(error.message, { tone: 'error' });
  }
}

function initTooltips() {
  const tip = document.getElementById('floating-tip');
  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest('[data-tip]');
    if (!target) {
      tip.hidden = true;
      return;
    }
    tip.textContent = target.dataset.tip;
    tip.hidden = false;
    const bounds = target.getBoundingClientRect();
    const left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, bounds.left + bounds.width / 2 - tip.offsetWidth / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${bounds.top + window.scrollY - tip.offsetHeight - 8}px`;
  });
}

async function boot() {
  injectSprite();
  initMascot();
  initTooltips();
  app.innerHTML = `<div class="loading">${illustration('ghost', 'loading__ghost')}<p>Summoning the experiments…</p></div>`;
  try {
    await preloadPendingImages();
    await loadData();
  } catch (error) {
    const isFile = location.protocol === 'file:';
    app.innerHTML = `
      <div class="page"><div class="empty-state">
        ${illustration('skull', 'empty-state__art')}
        <p class="empty-state__title">The spell failed to load the data</p>
        <p class="empty-state__text">${escapeHtml(isFile ? 'Browsers block data files opened directly from disk. Start a tiny local server in this folder (for example: python3 -m http.server 8000) and open http://localhost:8000.' : error.message)}</p>
      </div></div>`;
    return;
  }
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  window.addEventListener('hashchange', render);
  subscribe(render);
  render();
}

boot();
