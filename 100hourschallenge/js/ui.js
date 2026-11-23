import { escapeHtml } from './format.js';
import { resolveImage } from './images.js';
import { icon, illustration } from './sprite.js';

const MAX_TOASTS = 3;

export function toast(message, { tone = 'success', art = null, duration = 4200 } = {}) {
  const region = document.getElementById('toasts');
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  item.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  item.innerHTML = `${art ? illustration(art, 'toast__art') : ''}<p>${escapeHtml(message)}</p><button type="button" class="icon-button icon-button--small" aria-label="Dismiss">${icon('close')}</button>`;
  const remove = () => {
    item.classList.add('toast--leaving');
    setTimeout(() => item.remove(), 250);
  };
  item.querySelector('button').addEventListener('click', remove);
  region.append(item);
  [...region.children].slice(0, -MAX_TOASTS).forEach((old) => old.remove());
  setTimeout(remove, duration);
}

function showFormError(form, error) {
  const box = form.querySelector('.form-error');
  const message = typeof error === 'string' ? error : error.message;
  box.textContent = message;
  box.hidden = false;
  if (error.field) {
    const field = form.elements[error.field];
    const target = field instanceof RadioNodeList ? field[0] : field;
    if (target) {
      target.setAttribute('aria-invalid', 'true');
      target.focus();
    }
  }
}

export function openModal({ title, body, submitLabel = 'Save', tone = 'primary', wide = false, onSubmit, onClose, onMount }) {
  const dialog = document.getElementById('modal');
  dialog.className = `modal${wide ? ' modal--wide' : ''}`;
  dialog.innerHTML = `
    <form class="modal__form" novalidate>
      <header class="modal__header">
        ${illustration('ghost', 'modal__ghost')}
        <h2 id="modal-title">${escapeHtml(title)}</h2>
        <button type="button" class="icon-button" data-close aria-label="Close">${icon('close')}</button>
      </header>
      <div class="modal__body">${body}</div>
      <p class="form-error" role="alert" hidden></p>
      <footer class="modal__footer">
        <button type="button" class="button button--ghost" data-close>Cancel</button>
        <button type="submit" class="button button--${tone}">${escapeHtml(submitLabel)}</button>
      </footer>
    </form>`;
  const form = dialog.querySelector('form');
  const submitButton = form.querySelector('[type="submit"]');
  let submitted = false;
  dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('input', (event) => {
    event.target.removeAttribute?.('aria-invalid');
    form.querySelector('.form-error').hidden = true;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    submitButton.disabled = true;
    try {
      const error = await onSubmit(form);
      if (error) {
        showFormError(form, error);
        return;
      }
      submitted = true;
      dialog.close();
    } catch (error) {
      showFormError(form, error.message || 'Something went wrong. The ghost is investigating.');
    } finally {
      submitButton.disabled = false;
    }
  });
  dialog.addEventListener('close', () => {
    if (!submitted) onClose?.();
    dialog.innerHTML = '';
  }, { once: true });
  onMount?.(dialog);
  dialog.showModal();
  const firstField = form.querySelector('.modal__body input:not([type="hidden"]):not([type="radio"]), .modal__body textarea, .modal__body select');
  firstField?.focus();
}

export function confirmAction({ title, message, confirmLabel = 'Yes, do it', tone = 'danger' }) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p class="modal__message">${escapeHtml(message)}</p>`,
      submitLabel: confirmLabel,
      tone,
      onSubmit: () => {
        resolve(true);
        return null;
      },
      onClose: () => resolve(false),
    });
  });
}

export function openLightbox(photos, startIndex = 0) {
  const dialog = document.getElementById('lightbox');
  let index = startIndex;
  const render = () => {
    const photo = photos[index];
    dialog.innerHTML = `
      <figure class="lightbox__figure">
        <img src="${escapeHtml(resolveImage(photo.src))}" alt="${escapeHtml(photo.caption || 'Photo')}">
        <figcaption>${escapeHtml(photo.caption || '')}${photos.length > 1 ? `<span class="lightbox__count">${index + 1} / ${photos.length}</span>` : ''}</figcaption>
      </figure>
      <button type="button" class="icon-button lightbox__close" data-lightbox="close" aria-label="Close photo">${icon('close')}</button>
      ${photos.length > 1 ? `
        <button type="button" class="icon-button lightbox__nav lightbox__nav--prev" data-lightbox="prev" aria-label="Previous photo">${icon('chevronLeft')}</button>
        <button type="button" class="icon-button lightbox__nav lightbox__nav--next" data-lightbox="next" aria-label="Next photo">${icon('chevronRight')}</button>` : ''}`;
  };
  const step = (delta) => {
    index = (index + delta + photos.length) % photos.length;
    render();
    dialog.querySelector(`[data-lightbox="${delta > 0 ? 'next' : 'prev'}"]`)?.focus();
  };
  const onClick = (event) => {
    const action = event.target.closest('[data-lightbox]')?.dataset.lightbox;
    if (action === 'close' || event.target === dialog) dialog.close();
    if (action === 'prev') step(-1);
    if (action === 'next') step(1);
  };
  const onKey = (event) => {
    if (event.key === 'ArrowLeft' && photos.length > 1) step(-1);
    if (event.key === 'ArrowRight' && photos.length > 1) step(1);
  };
  render();
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('keydown', onKey);
  dialog.addEventListener('close', () => {
    dialog.removeEventListener('click', onClick);
    dialog.removeEventListener('keydown', onKey);
    dialog.innerHTML = '';
  }, { once: true });
  dialog.showModal();
}

let mascotMessage = () => 'Boo.';
let mascotTimer = null;

export function setMascotContext(provider) {
  mascotMessage = provider;
}

export function mascotSay(text) {
  const bubble = document.getElementById('mascot-bubble');
  bubble.querySelector('p').textContent = text;
  bubble.hidden = false;
  document.getElementById('mascot-button').setAttribute('aria-expanded', 'true');
  clearTimeout(mascotTimer);
  mascotTimer = setTimeout(hideMascot, 9000);
}

export function hideMascot() {
  document.getElementById('mascot-bubble').hidden = true;
  document.getElementById('mascot-button').setAttribute('aria-expanded', 'false');
}

export function initMascot() {
  const button = document.getElementById('mascot-button');
  button.innerHTML = illustration('ghost', 'mascot__ghost');
  button.addEventListener('click', () => {
    const bubble = document.getElementById('mascot-bubble');
    if (!bubble.hidden) {
      hideMascot();
      return;
    }
    mascotSay(mascotMessage());
  });
  document.getElementById('mascot-close').addEventListener('click', hideMascot);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
