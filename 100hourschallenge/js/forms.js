import { newlyUnlocked, reachedMilestoneKeys } from './achievements.js';
import { escapeHtml, isValidIsoDate, slugify, todayIso, uid } from './format.js';
import { compressImage, deletePendingImage, resolveImage, savePendingImage } from './images.js';
import { milestoneCheer } from './messages.js';
import { RESOURCE_TYPES, nextColorSlot, normalizeChallenge } from './model.js';
import { COVER_ILLUSTRATIONS, icon, illustration } from './sprite.js';
import { findChallenge, getData, mutate } from './store.js';
import { openModal, toast } from './ui.js';
import { FINAL_DECISIONS } from './views/challenge.js';

const LIMITS = { title: 80, category: 40, goal: 240, longText: 4000, shortText: 1000 };

export function commit(recipe, successMessage) {
  const before = getData();
  const changed = mutate(recipe);
  if (!changed) return false;
  const after = getData();
  if (successMessage) toast(successMessage);
  const previousMilestones = reachedMilestoneKeys(before);
  reachedMilestoneKeys(after).forEach((label, key) => {
    if (!previousMilestones.has(key)) toast(milestoneCheer(label), { tone: 'achievement', art: 'star', duration: 6500 });
  });
  newlyUnlocked(before, after).forEach((achievement) => {
    toast(`Achievement unlocked: ${achievement.title}! ${achievement.description}`, { tone: 'achievement', art: achievement.icon, duration: 6500 });
  });
  return true;
}

function field({ label, name, type = 'text', value = '', required = false, hint = '', attributes = '' }) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : '';
  const describedBy = hint ? `aria-describedby="${hintId}"` : '';
  const input = type === 'textarea'
    ? `<textarea id="${id}" name="${name}" rows="4" ${required ? 'required' : ''} ${describedBy} ${attributes}>${escapeHtml(value)}</textarea>`
    : `<input id="${id}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? 'required' : ''} ${describedBy} ${attributes}>`;
  return `
    <div class="field">
      <label for="${id}">${escapeHtml(label)}${required ? ' <span class="field__required" aria-hidden="true">*</span>' : ''}</label>
      ${input}
      ${hint ? `<p class="field__hint" id="${hintId}">${escapeHtml(hint)}</p>` : ''}
    </div>`;
}

function text(form, name) {
  return (form.elements[name]?.value || '').trim();
}

function uploadPath(challengeId, extension) {
  return `uploads/${challengeId}/${todayIso()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

function photoFieldMarkup(name, label, hint = 'JPG, PNG, HEIC-converted or GIF. Photos are resized to 1600px to keep the site light.') {
  return `
    <fieldset class="photo-field" data-photo-field="${name}">
      <legend>${escapeHtml(label)}</legend>
      <ul class="photo-field__list"></ul>
      <label class="button button--ghost button--small photo-field__add">
        ${icon('camera')}<span>Add photos</span>
        <input type="file" accept="image/*" multiple class="visually-hidden">
      </label>
      <p class="field__hint">${escapeHtml(hint)}</p>
      <p class="photo-field__status" role="status"></p>
    </fieldset>`;
}

function createPhotoField(dialog, name, initialPhotos, challengeId) {
  const root = dialog.querySelector(`[data-photo-field="${name}"]`);
  const list = root.querySelector('.photo-field__list');
  const status = root.querySelector('.photo-field__status');
  const photos = initialPhotos.map((photo) => ({ ...photo }));
  const addedThisTime = new Set();
  let pending = Promise.resolve();

  const render = () => {
    list.innerHTML = photos.map((photo, index) => `
      <li class="photo-field__item">
        <img src="${escapeHtml(resolveImage(photo.src))}" alt="">
        <label class="visually-hidden" for="${name}-caption-${index}">Caption for photo ${index + 1}</label>
        <input id="${name}-caption-${index}" type="text" maxlength="140" placeholder="Caption (optional)" value="${escapeHtml(photo.caption || '')}" data-caption="${index}">
        <button type="button" class="icon-button icon-button--small icon-button--danger" data-remove-photo="${index}" aria-label="Remove photo ${index + 1}">${icon('trash')}</button>
      </li>`).join('');
  };

  list.addEventListener('input', (event) => {
    const index = event.target.dataset.caption;
    if (index !== undefined) photos[Number(index)].caption = event.target.value;
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-photo]');
    if (!button) return;
    const [removed] = photos.splice(Number(button.dataset.removePhoto), 1);
    if (addedThisTime.has(removed.src)) {
      addedThisTime.delete(removed.src);
      deletePendingImage(removed.src);
    }
    render();
  });
  root.querySelector('input[type="file"]').addEventListener('change', (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (!files.length) return;
    status.textContent = `Brewing ${files.length} photo${files.length > 1 ? 's' : ''}…`;
    pending = pending.then(async () => {
      const failures = [];
      for (const file of files) {
        try {
          const { blob, extension } = await compressImage(file);
          const path = uploadPath(challengeId, extension);
          await savePendingImage(path, blob);
          addedThisTime.add(path);
          photos.push({ src: path, caption: '' });
          render();
        } catch (error) {
          failures.push(error.message);
        }
      }
      status.textContent = failures.length ? failures.join(' ') : 'Photos ready.';
    });
  });
  render();
  return {
    ready: () => pending,
    photos: () => photos.map((photo) => ({ src: photo.src, caption: (photo.caption || '').trim() })),
    discardUnsaved: () => addedThisTime.forEach((path) => deletePendingImage(path)),
  };
}

function coverPicker(current) {
  const isUpload = !current.startsWith('svg:');
  const options = COVER_ILLUSTRATIONS.map((name) => `
    <label class="cover-option">
      <input type="radio" name="cover" value="svg:${name}" ${current === `svg:${name}` ? 'checked' : ''}>
      <span class="cover-option__art">${illustration(name)}</span>
      <span class="visually-hidden">${name} illustration</span>
    </label>`).join('');
  return `
    <fieldset class="cover-picker">
      <legend>Cover image</legend>
      <div class="cover-picker__grid">
        ${options}
        <label class="cover-option cover-option--upload">
          <input type="radio" name="cover" value="upload" ${isUpload ? 'checked' : ''}>
          <span class="cover-option__art cover-option__preview">${isUpload ? `<img src="${escapeHtml(resolveImage(current))}" alt="">` : icon('camera')}</span>
          <span class="cover-option__label">Your photo</span>
        </label>
      </div>
      <label class="button button--ghost button--small">${icon('camera')}<span>Upload a cover photo</span><input type="file" accept="image/*" class="visually-hidden" data-cover-upload></label>
      <p class="photo-field__status" role="status"></p>
    </fieldset>`;
}

function uniqueChallengeId(title) {
  const base = slugify(title);
  const ids = new Set(getData().challenges.map((challenge) => challenge.id));
  if (!ids.has(base)) return base;
  let counter = 2;
  while (ids.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

export function openChallengeForm(existing = null) {
  let uploadedCover = existing && !existing.cover.startsWith('svg:') ? existing.cover : null;
  let freshUpload = null;
  let pending = Promise.resolve();
  const currentCover = existing ? existing.cover : 'svg:cauldron';
  const body = `
    ${field({ label: 'Title', name: 'title', value: existing?.title, required: true, attributes: `maxlength="${LIMITS.title}"` })}
    <div class="field-row">
      ${field({ label: 'Category', name: 'category', value: existing?.category, attributes: `maxlength="${LIMITS.category}" placeholder="Creative Skills"` })}
      ${field({ label: 'Target hours', name: 'targetHours', type: 'number', value: existing?.targetHours ?? 100, required: true, attributes: 'min="1" max="1000" step="1" inputmode="numeric"' })}
    </div>
    ${field({ label: 'Goal', name: 'goal', type: 'textarea', value: existing?.goal, attributes: `maxlength="${LIMITS.goal}" rows="2"` })}
    ${field({ label: 'Personal description', name: 'description', type: 'textarea', value: existing?.description, hint: 'Why this? What could possibly go wrong?', attributes: `maxlength="${LIMITS.longText}"` })}
    <div class="field-row">
      ${field({ label: 'Start date', name: 'startDate', type: 'date', value: existing ? existing.startDate || '' : todayIso(), hint: 'Required for active experiments.' })}
      ${existing ? '' : `
        <div class="field">
          <label for="field-status">Status</label>
          <select id="field-status" name="status">
            <option value="active">Active: starting now</option>
            <option value="planned">Planned: someday soon</option>
          </select>
        </div>`}
    </div>
    ${coverPicker(currentCover)}`;

  openModal({
    title: existing ? 'Edit experiment' : 'New experiment',
    body,
    wide: true,
    submitLabel: existing ? 'Save changes' : 'Create experiment',
    onMount: (dialog) => {
      const status = dialog.querySelector('.cover-picker .photo-field__status');
      dialog.querySelector('[data-cover-upload]').addEventListener('change', (event) => {
        const [file] = event.target.files;
        event.target.value = '';
        if (!file) return;
        status.textContent = 'Brewing your cover…';
        pending = pending.then(async () => {
          try {
            const { blob, extension } = await compressImage(file, 1400);
            const path = uploadPath('covers', extension);
            await savePendingImage(path, blob);
            if (freshUpload) deletePendingImage(freshUpload);
            freshUpload = path;
            uploadedCover = path;
            dialog.querySelector('.cover-option__preview').innerHTML = `<img src="${escapeHtml(resolveImage(path))}" alt="">`;
            dialog.querySelector('input[name="cover"][value="upload"]').checked = true;
            status.textContent = 'Cover ready.';
          } catch (error) {
            status.textContent = error.message;
          }
        });
      });
    },
    onClose: () => {
      if (freshUpload) deletePendingImage(freshUpload);
    },
    onSubmit: async (form) => {
      await pending;
      const title = text(form, 'title');
      const targetHours = Number(form.elements.targetHours.value);
      const startDate = text(form, 'startDate');
      const status = existing ? existing.status : form.elements.status.value;
      const coverChoice = form.elements.cover.value;
      if (!title) return { field: 'title', message: 'Every experiment needs a name, even a cursed one.' };
      if (!Number.isFinite(targetHours) || targetHours < 1 || targetHours > 1000) return { field: 'targetHours', message: 'Target hours must be between 1 and 1000.' };
      if (startDate && !isValidIsoDate(startDate)) return { field: 'startDate', message: 'That start date does not look right.' };
      if (!startDate && status !== 'planned') return { field: 'startDate', message: 'Active, paused or completed experiments need a start date.' };
      if (startDate && existing?.sessions.some((session) => session.date < startDate)) {
        return { field: 'startDate', message: 'Some sessions are logged before this start date. Move the date earlier or fix those sessions first.' };
      }
      if (coverChoice === 'upload' && !uploadedCover) return { field: 'cover', message: 'Upload a photo first, or pick one of the illustrations.' };
      const cover = coverChoice === 'upload' ? uploadedCover : coverChoice;
      const fields = {
        title,
        category: text(form, 'category').slice(0, LIMITS.category),
        goal: text(form, 'goal'),
        description: text(form, 'description'),
        targetHours: Math.round(targetHours),
        startDate: startDate || null,
        cover,
      };
      if (existing) {
        commit((data) => {
          const challenge = data.challenges.find((item) => item.id === existing.id);
          Object.assign(challenge, fields);
        }, 'Experiment updated.');
        if (freshUpload && cover !== freshUpload) deletePendingImage(freshUpload);
        freshUpload = null;
        return null;
      }
      const id = uniqueChallengeId(title);
      commit((data) => {
        data.challenges.push(normalizeChallenge({
          id,
          ...fields,
          status,
          colorSlot: nextColorSlot(data),
          createdAt: new Date().toISOString(),
          history: [{ status, date: todayIso() }],
        }));
      }, 'A new experiment crawls out of the cauldron!');
      if (freshUpload && cover !== freshUpload) deletePendingImage(freshUpload);
      freshUpload = null;
      location.hash = `#/challenge/${encodeURIComponent(id)}`;
      return null;
    },
  });
}

export function openSessionForm(challengeId, sessionId = null) {
  const challenge = findChallenge(challengeId);
  const existing = sessionId ? challenge.sessions.find((session) => session.id === sessionId) : null;
  const hours = existing ? Math.floor(existing.minutes / 60) : 1;
  const minutes = existing ? existing.minutes % 60 : 0;
  const body = `
    <p class="modal__context">${illustration('potion')}<span>${escapeHtml(challenge.title)}</span></p>
    ${field({ label: 'Date', name: 'date', type: 'date', value: existing?.date || todayIso(), required: true, attributes: `max="${todayIso()}" ${challenge.startDate ? `min="${challenge.startDate}"` : ''}` })}
    <fieldset class="duration-field">
      <legend>Duration <span class="field__required" aria-hidden="true">*</span></legend>
      <div class="field-row field-row--tight">
        <div class="field"><label for="field-hours">Hours</label><input id="field-hours" name="hours" type="number" min="0" max="24" step="1" inputmode="numeric" value="${hours}"></div>
        <div class="field"><label for="field-minutes">Minutes</label><input id="field-minutes" name="minutes" type="number" min="0" max="59" step="5" inputmode="numeric" value="${minutes}"></div>
      </div>
      <div class="quick-durations" role="group" aria-label="Quick durations">
        ${[[0, 30], [1, 0], [1, 30], [2, 0], [3, 0]].map(([h, m]) => `<button type="button" class="chip chip--small" data-quick-duration="${h}:${m}">${h ? `${h}h` : ''}${m ? ` ${m}m` : ''}</button>`).join('')}
      </div>
    </fieldset>
    ${field({ label: 'What did I do?', name: 'did', type: 'textarea', value: existing?.did, required: true, attributes: `maxlength="${LIMITS.shortText}" rows="3" placeholder="Practised lines on fake skin, cried a little."` })}
    ${field({ label: 'Difficulties', name: 'difficulties', type: 'textarea', value: existing?.difficulties, attributes: `maxlength="${LIMITS.shortText}" rows="2"` })}
    ${field({ label: 'Personal notes', name: 'notes', type: 'textarea', value: existing?.notes, attributes: `maxlength="${LIMITS.shortText}" rows="2"` })}`;

  openModal({
    title: existing ? 'Edit session' : 'Log a session',
    body,
    submitLabel: existing ? 'Save session' : 'Log hours',
    onMount: (dialog) => {
      dialog.querySelectorAll('[data-quick-duration]').forEach((button) => {
        button.addEventListener('click', () => {
          const [h, m] = button.dataset.quickDuration.split(':');
          dialog.querySelector('[name="hours"]').value = h;
          dialog.querySelector('[name="minutes"]').value = m;
        });
      });
    },
    onSubmit: (form) => {
      const date = text(form, 'date');
      const hoursValue = Number(form.elements.hours.value || 0);
      const minutesValue = Number(form.elements.minutes.value || 0);
      const total = Math.round(hoursValue * 60 + minutesValue);
      const did = text(form, 'did');
      if (!isValidIsoDate(date)) return { field: 'date', message: 'Pick a valid date.' };
      if (date > todayIso()) return { field: 'date', message: 'Sessions from the future are not allowed. Yet.' };
      if (challenge.startDate && date < challenge.startDate) return { field: 'date', message: 'That date is before this experiment started.' };
      if (!Number.isInteger(hoursValue) || hoursValue < 0 || hoursValue > 24) return { field: 'hours', message: 'Hours must be a whole number between 0 and 24.' };
      if (!Number.isInteger(minutesValue) || minutesValue < 0 || minutesValue > 59) return { field: 'minutes', message: 'Minutes must be between 0 and 59.' };
      if (total <= 0) return { field: 'hours', message: 'A session needs at least one minute. Thinking about it does not count (sadly).' };
      const sameDay = challenge.sessions.filter((session) => session.date === date && session.id !== sessionId).reduce((sum, session) => sum + session.minutes, 0);
      if (sameDay + total > 24 * 60) return { field: 'hours', message: 'That would be more than 24 hours in a single day. Even witches sleep.' };
      if (!did) return { field: 'did', message: 'Write at least a few words about what you did.' };
      const values = { date, minutes: total, did, difficulties: text(form, 'difficulties'), notes: text(form, 'notes') };
      commit((data) => {
        const target = data.challenges.find((item) => item.id === challengeId);
        if (existing) {
          Object.assign(target.sessions.find((session) => session.id === sessionId), values);
        } else {
          target.sessions.push({ id: uid('session'), createdAt: new Date().toISOString(), ...values });
        }
      }, existing ? 'Session updated.' : 'Hours logged. The ghost is impressed.');
      return null;
    },
  });
}

export function openEntryForm(challengeId, entryId = null) {
  const challenge = findChallenge(challengeId);
  const existing = entryId ? challenge.diary.find((entry) => entry.id === entryId) : null;
  let photoField;
  const body = `
    <p class="modal__context">${illustration('candle')}<span>${escapeHtml(challenge.title)}</span></p>
    <div class="field-row">
      ${field({ label: 'Title', name: 'title', value: existing?.title, required: true, attributes: 'maxlength="120"' })}
      ${field({ label: 'Date', name: 'date', type: 'date', value: existing?.date || todayIso(), required: true, attributes: `max="${todayIso()}"` })}
    </div>
    ${field({ label: 'The story', name: 'body', type: 'textarea', value: existing?.body, required: true, hint: 'Leave an empty line between paragraphs.', attributes: `maxlength="${LIMITS.longText * 2}" rows="7"` })}
    ${photoFieldMarkup('photos', 'Photos')}
    ${field({ label: 'Video links', name: 'videos', type: 'textarea', value: existing?.videos?.join('\n'), hint: 'One link per line. YouTube and Vimeo links become embedded players.', attributes: 'rows="2" placeholder="https://youtu.be/…"' })}
    ${field({ label: 'Notes & reflections', name: 'notes', type: 'textarea', value: existing?.notes, attributes: `maxlength="${LIMITS.longText}" rows="3"` })}
    <label class="checkbox">
      <input type="checkbox" name="failure" ${existing?.failure ? 'checked' : ''}>
      <span>${illustration('skull')} This one was a glorious failure</span>
    </label>`;

  openModal({
    title: existing ? 'Edit diary entry' : 'New diary entry',
    body,
    wide: true,
    submitLabel: existing ? 'Save entry' : 'Publish to diary',
    onMount: (dialog) => {
      photoField = createPhotoField(dialog, 'photos', existing?.photos || [], challengeId);
    },
    onClose: () => photoField?.discardUnsaved(),
    onSubmit: async (form) => {
      await photoField.ready();
      const title = text(form, 'title');
      const date = text(form, 'date');
      const entryBody = text(form, 'body');
      const videos = text(form, 'videos').split('\n').map((line) => line.trim()).filter(Boolean);
      if (!title) return { field: 'title', message: 'Give this entry a title.' };
      if (!isValidIsoDate(date)) return { field: 'date', message: 'Pick a valid date.' };
      if (date > todayIso()) return { field: 'date', message: 'Diary entries from the future are a little too witchy.' };
      if (!entryBody) return { field: 'body', message: 'Write at least a couple of lines. Even "it went badly" counts.' };
      const invalidVideo = videos.find((url) => {
        try {
          return !['http:', 'https:'].includes(new URL(url).protocol);
        } catch {
          return true;
        }
      });
      if (invalidVideo) return { field: 'videos', message: `"${invalidVideo}" is not a valid link (it should start with https://).` };
      const values = { title, date, body: entryBody, videos, notes: text(form, 'notes'), failure: form.elements.failure.checked, photos: photoField.photos() };
      commit((data) => {
        const target = data.challenges.find((item) => item.id === challengeId);
        if (existing) {
          Object.assign(target.diary.find((entry) => entry.id === entryId), values);
        } else {
          target.diary.push({ id: uid('entry'), createdAt: new Date().toISOString(), ...values });
        }
      }, existing ? 'Diary entry updated.' : 'A new page in the diary!');
      return null;
    },
  });
}

export function openMilestoneForm(challengeId) {
  const challenge = findChallenge(challengeId);
  const body = `
    <p class="modal__context">${illustration('star')}<span>${escapeHtml(challenge.title)}</span></p>
    <div class="field-row">
      ${field({ label: 'At how many hours?', name: 'hours', type: 'number', required: true, attributes: 'min="0.5" max="1000" step="0.5" inputmode="decimal"' })}
      ${field({ label: 'Title', name: 'title', required: true, attributes: 'maxlength="60" placeholder="First tattoo on fake skin"' })}
    </div>
    ${field({ label: 'Description', name: 'description', type: 'textarea', attributes: 'maxlength="240" rows="2"' })}`;
  openModal({
    title: 'Custom milestone',
    body,
    submitLabel: 'Add milestone',
    onSubmit: (form) => {
      const hours = Number(form.elements.hours.value);
      const title = text(form, 'title');
      if (!Number.isFinite(hours) || hours <= 0 || hours > 1000) return { field: 'hours', message: 'Choose a number of hours between 0.5 and 1000.' };
      if (!title) return { field: 'title', message: 'Name your milestone.' };
      commit((data) => {
        data.challenges.find((item) => item.id === challengeId).customMilestones.push({ id: uid('milestone'), hours: Math.round(hours * 2) / 2, title, description: text(form, 'description') });
      }, 'Milestone added.');
      return null;
    },
  });
}

export function openFinalForm(challengeId) {
  const challenge = findChallenge(challengeId);
  const final = challenge.final || {};
  let beforeField;
  let afterField;
  const body = `
    <p class="modal__context">${illustration('cauldron')}<span>${escapeHtml(challenge.title)}</span></p>
    ${field({ label: 'Final result', name: 'result', type: 'textarea', value: final.result, hint: 'The verdict in a few lines. Shown on the dashboard too.', attributes: `maxlength="${LIMITS.longText}" rows="3"` })}
    <div class="field-row">
      ${photoFieldMarkup('beforePhotos', 'Before photos', 'Where it all started.')}
      ${photoFieldMarkup('afterPhotos', 'After photos', 'The first after photo becomes the trophy image.')}
    </div>
    ${field({ label: 'What I learned', name: 'learned', type: 'textarea', value: final.learned, attributes: `maxlength="${LIMITS.longText}" rows="3"` })}
    ${field({ label: 'The hardest part', name: 'hardest', type: 'textarea', value: final.hardest, attributes: `maxlength="${LIMITS.longText}" rows="3"` })}
    ${field({ label: 'What I loved', name: 'liked', type: 'textarea', value: final.liked, attributes: `maxlength="${LIMITS.longText}" rows="3"` })}
    <fieldset class="rating-field">
      <legend>Personal rating</legend>
      <div class="rating-field__options">
        ${[1, 2, 3, 4, 5].map((value) => `<label><input type="radio" name="rating" value="${value}" ${Number(final.rating) === value ? 'checked' : ''}><span>${illustration('skull')}<span>${value}</span></span></label>`).join('')}
      </div>
    </fieldset>
    <fieldset class="radio-list">
      <legend>Continue beyond 100 hours?</legend>
      ${Object.entries(FINAL_DECISIONS).map(([value, label]) => `<label><input type="radio" name="decision" value="${value}" ${final.decision === value ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`).join('')}
    </fieldset>`;
  openModal({
    title: 'Final results',
    body,
    wide: true,
    submitLabel: 'Save final results',
    onMount: (dialog) => {
      beforeField = createPhotoField(dialog, 'beforePhotos', final.beforePhotos || [], challengeId);
      afterField = createPhotoField(dialog, 'afterPhotos', final.afterPhotos || [], challengeId);
    },
    onClose: () => {
      beforeField?.discardUnsaved();
      afterField?.discardUnsaved();
    },
    onSubmit: async (form) => {
      await Promise.all([beforeField.ready(), afterField.ready()]);
      const values = {
        result: text(form, 'result'),
        beforePhotos: beforeField.photos(),
        afterPhotos: afterField.photos(),
        learned: text(form, 'learned'),
        hardest: text(form, 'hardest'),
        liked: text(form, 'liked'),
        rating: Number(form.elements.rating.value) || null,
        decision: form.elements.decision.value || null,
      };
      const isEmpty = !values.result && !values.learned && !values.hardest && !values.liked && !values.rating && !values.decision && !values.beforePhotos.length && !values.afterPhotos.length;
      if (isEmpty) return 'Fill in at least one part of the final results.';
      commit((data) => {
        data.challenges.find((item) => item.id === challengeId).final = values;
      }, 'Final results saved. What a journey.');
      return null;
    },
  });
}

export function openResourceForm(challengeId, resourceId = null) {
  const challenge = findChallenge(challengeId);
  const existing = resourceId ? challenge.resources.find((resource) => resource.id === resourceId) : null;
  const options = Object.entries(RESOURCE_TYPES)
    .map(([value, type]) => `<option value="${value}" ${(existing?.type || 'video') === value ? 'selected' : ''}>${escapeHtml(type.label)}</option>`)
    .join('');
  const body = `
    <p class="modal__context">${illustration('potion')}<span>${escapeHtml(challenge.title)}</span></p>
    ${field({ label: 'Title', name: 'title', value: existing?.title, required: true, attributes: 'maxlength="120"' })}
    ${field({ label: 'Link', name: 'url', type: 'url', value: existing?.url, required: true, attributes: 'placeholder="https://…" inputmode="url"' })}
    <div class="field">
      <label for="field-type">Type</label>
      <select id="field-type" name="type">${options}</select>
    </div>
    ${field({ label: 'Why it is useful', name: 'note', type: 'textarea', value: existing?.note, attributes: 'maxlength="300" rows="2"' })}`;
  openModal({
    title: existing ? 'Edit resource' : 'Add to the spellbook',
    body,
    submitLabel: existing ? 'Save resource' : 'Add resource',
    onSubmit: (form) => {
      const title = text(form, 'title');
      const url = text(form, 'url');
      const type = form.elements.type.value;
      if (!title) return { field: 'title', message: 'Give this resource a name.' };
      try {
        if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
      } catch {
        return { field: 'url', message: 'That link does not look right (it should start with https://).' };
      }
      if (!RESOURCE_TYPES[type]) return { field: 'type', message: 'Pick a type.' };
      const duplicate = challenge.resources.some((resource) => resource.url === url && resource.id !== resourceId);
      if (duplicate) return { field: 'url', message: 'This link is already in the spellbook.' };
      const values = { title, url, type, note: text(form, 'note') };
      commit((data) => {
        const target = data.challenges.find((item) => item.id === challengeId);
        if (existing) Object.assign(target.resources.find((resource) => resource.id === resourceId), values);
        else target.resources.push({ id: uid('resource'), ...values });
      }, existing ? 'Resource updated.' : 'Added to the spellbook.');
      return null;
    },
  });
}
