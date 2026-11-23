const INK = '#151419';
const BONE = '#F0EBE7';
const LAVENDER = '#B9A4D3';
const ROSE = '#D9A9B9';
const PLUM = '#352440';
const SHADOW = '#4A3863';
const GOLD = '#E6D38A';
const SLIME = '#9BC9B0';
const PUMPKIN = '#E8A86B';

const outline = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
const blush = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="2.8" ry="1.7" fill="${ROSE}"/><ellipse cx="${x2}" cy="${y}" rx="2.8" ry="1.7" fill="${ROSE}"/>`;
const dotEyes = (x1, x2, y, r = 2.6, color = INK) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${color}"/>`;
const smile = (cx, y, w = 3, color = INK) => `<path d="M${cx - w} ${y}q${w} ${w} ${w * 2} 0" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;

function cobweb() {
  const radialAngles = [0, 22.5, 45, 67.5, 90].map((deg) => (deg * Math.PI) / 180);
  const point = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle)];
  const spokes = radialAngles.map((angle) => {
    const [x, y] = point(100, angle);
    return `M0 0L${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const rings = [22, 44, 66, 88].map((radius) => {
    let d = '';
    radialAngles.forEach((angle, index) => {
      const [x, y] = point(radius, angle);
      if (index === 0) {
        d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
        return;
      }
      const middle = (angle + radialAngles[index - 1]) / 2;
      const [cx, cy] = point(radius * 0.82, middle);
      d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  });
  return `<path d="${spokes.join('')}${rings.join('')}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`;
}

const SYMBOLS = {
  ghost: `<symbol id="i-ghost" viewBox="0 0 64 64"><path d="M14 54V30a18 18 0 0 1 36 0v24l-6-4-6 4-6-4-6 4-6-4-6 4z" fill="${BONE}" ${outline}/>${dotEyes(26, 38, 30)}${blush(21, 43, 36)}${smile(29, 36)}</symbol>`,
  cat: `<symbol id="i-cat" viewBox="0 0 64 64"><path d="M44 54c9 0 13-7 10-14" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M44 54c9 0 13-7 10-14" fill="none" stroke="${SHADOW}" stroke-width="3.5" stroke-linecap="round"/><path d="M14 57c0-10 4-16 9-19-4-3-6-8-5-13l-2-12 9 7c3-1 9-1 12 0l9-7-2 12c1 5-1 10-5 13 5 3 9 9 9 19z" fill="${SHADOW}" ${outline}/><path d="M18 18l3 6M46 18l-3 6" stroke="${ROSE}" stroke-width="2" stroke-linecap="round"/><ellipse cx="27" cy="28" rx="2.6" ry="3.2" fill="${GOLD}"/><ellipse cx="37" cy="28" rx="2.6" ry="3.2" fill="${GOLD}"/><circle cx="27" cy="28.5" r="1.1" fill="${INK}"/><circle cx="37" cy="28.5" r="1.1" fill="${INK}"/><path d="M30.5 33l1.5 1.5 1.5-1.5" fill="none" stroke="${ROSE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 34h-6M22 36l-5 2M42 34h6M42 36l5 2" stroke="${LAVENDER}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/></symbol>`,
  bat: `<symbol id="i-bat" viewBox="0 0 64 64"><path d="M26 31C20 22 10 22 3 28c4 0 7 3 7 7 3-2 7-2 9 1 1-3 4-4 7-3zM38 31c6-9 16-9 23-3-4 0-7 3-7 7-3-2-7-2-9 1-1-3-4-4-7-3z" fill="${SHADOW}" ${outline}/><path d="M25 29l1-9 5 5h2l5-5 1 9c1 6-2 12-7 12s-8-6-7-12z" fill="${SHADOW}" ${outline}/>${dotEyes(28.5, 35.5, 30, 2, GOLD)}<path d="M29.5 35l1 2 1-2M32.5 35l1 2 1-2" fill="${BONE}" stroke="${BONE}" stroke-width="1" stroke-linejoin="round"/></symbol>`,
  skull: `<symbol id="i-skull" viewBox="0 0 64 64"><path d="M12 30c0-12 9-20 20-20s20 8 20 20c0 7-3 11-7 13v7a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3v-7c-4-2-7-6-7-13z" fill="${BONE}" ${outline}/><ellipse cx="24" cy="31" rx="5" ry="5.5" fill="${INK}"/><ellipse cx="40" cy="31" rx="5" ry="5.5" fill="${INK}"/><circle cx="25.5" cy="29.5" r="1.6" fill="${BONE}"/><circle cx="41.5" cy="29.5" r="1.6" fill="${BONE}"/><path d="M30 40l2-3 2 3z" fill="${INK}"/><path d="M26 45q6 4 12 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M28.5 47v5M32 47.5v5M35.5 47v5" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>${blush(16.5, 47.5, 38)}</symbol>`,
  pumpkin: `<symbol id="i-pumpkin" viewBox="0 0 64 64"><path d="M32 20c-1-6 1-10 6-12" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M32 20c-1-6 1-10 6-12" fill="none" stroke="${SLIME}" stroke-width="2" stroke-linecap="round"/><ellipse cx="32" cy="39" rx="25" ry="19" fill="${PUMPKIN}" ${outline}/><path d="M32 20c-8 4-8 34 0 38M32 20c8 4 8 34 0 38M19 23c-8 8-8 24 0 32M45 23c8 8 8 24 0 32" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".35"/><path d="M21 36l4.5-6 4.5 6zM34 36l4.5-6 4.5 6z" fill="${INK}"/><path d="M24 44q8 7 16 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>${blush(16, 48, 42)}</symbol>`,
  vampire: `<symbol id="i-vampire" viewBox="0 0 64 64"><path d="M8 60l7-22 17 6 17-6 7 22z" fill="${PLUM}" ${outline}/><path d="M17 38l-8-11 14 5zM47 38l8-11-14 5z" fill="#C25576" ${outline}/><circle cx="32" cy="31" r="15" fill="#E9DDE8" ${outline}/><path d="M17 29c0-10 7-15 15-15s15 5 15 15c-4-2-8-6-11-6l-4 6-4-6c-3 0-7 4-11 6z" fill="${INK}"/>${dotEyes(26.5, 37.5, 32, 2.2)}${blush(22, 42, 37)}<path d="M27 38.5h10" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M28.5 38.5l1.4 3.4 1.4-3.4zM32.7 38.5l1.4 3.4 1.4-3.4z" fill="#fff" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/></symbol>`,
  monster: `<symbol id="i-monster" viewBox="0 0 64 64"><path d="M21 22l-5-11 10 6M43 22l5-11-10 6" fill="${BONE}" ${outline}/><path d="M10 55c-2-20 6-35 22-35s24 15 22 35c-3 2-5-2-8 0s-4 3-7 0-4 2-7 0-4-3-7 0-5 2-8 0-4 2-7 0z" fill="${SLIME}" ${outline}/><circle cx="32" cy="35" r="9" fill="${BONE}" ${outline}/><circle cx="33" cy="36" r="4" fill="${INK}"/><circle cx="34.5" cy="34.5" r="1.3" fill="${BONE}"/><path d="M25 48q7 5 14 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M29 49.5l1.5 2.5 1.5-2" fill="${BONE}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>${blush(19, 45, 43)}</symbol>`,
  potion: `<symbol id="i-potion" viewBox="0 0 64 64"><path d="M26 10h12v4h-2v9c9 3 15 10 15 19 0 11-8 16-19 16s-19-5-19-16c0-9 6-16 15-19v-9h-2z" fill="${PLUM}" fill-opacity=".7"/><path d="M13.5 42c6-4 12 2 18-1s13-3 19 1c-.5 10-8 15-18.5 15S13.5 52 13.5 42z" fill="${LAVENDER}"/><path d="M26 10h12v4h-2v9c9 3 15 10 15 19 0 11-8 16-19 16s-19-5-19-16c0-9 6-16 15-19v-9h-2z" fill="none" ${outline}/><rect x="27" y="5" width="10" height="6" rx="2" fill="#B98A62" ${outline}/>${dotEyes(28, 36, 47, 2)}${smile(30, 51, 2)}<circle cx="24" cy="36" r="2" fill="${BONE}" opacity=".8"/><circle cx="40" cy="31" r="1.4" fill="${BONE}" opacity=".7"/><path d="M20 30q-2 4-1 8" fill="none" stroke="${BONE}" stroke-width="2" stroke-linecap="round" opacity=".6"/></symbol>`,
  star: `<symbol id="i-star" viewBox="0 0 64 64"><path d="M32 5c2.5 14 7 21.5 27 27-20 5.5-24.5 13-27 27-2.5-14-7-21.5-27-27 20-5.5 24.5-13 27-27z" fill="${GOLD}" ${outline}/></symbol>`,
  moon: `<symbol id="i-moon" viewBox="0 0 64 64"><path d="M40 7a25 25 0 1 0 17 39A21 21 0 1 1 40 7z" fill="${BONE}" ${outline}/><path d="M17 33q3 3 6 0M27 38q3 3 6 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><ellipse cx="16" cy="40" rx="2.8" ry="1.7" fill="${ROSE}"/><path d="M24 45q3 2 5 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/></symbol>`,
  mushroom: `<symbol id="i-mushroom" viewBox="0 0 64 64"><path d="M23 37h18v15a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5z" fill="${BONE}" ${outline}/><path d="M7 38c0-14 11-25 25-25s25 11 25 25z" fill="${ROSE}" ${outline}/><circle cx="21" cy="26" r="3.6" fill="${BONE}"/><circle cx="36" cy="20" r="2.6" fill="${BONE}"/><circle cx="45" cy="30" r="3.1" fill="${BONE}"/><circle cx="29" cy="32" r="1.8" fill="${BONE}"/>${dotEyes(28.5, 35.5, 45, 1.8)}${smile(30.5, 49, 1.5)}</symbol>`,
  spider: `<symbol id="i-spider" viewBox="0 0 64 64"><path d="M32 0v26" stroke="#AAA5B2" stroke-width="1.5"/><path d="M24 35l-10-7-7 6M23 40H11l-5 6M25 44l-8 6-2 8M40 35l10-7 7 6M41 40h12l5 6M39 44l8 6 2 8" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 35l-10-7-7 6M23 40H11l-5 6M25 44l-8 6-2 8M40 35l10-7 7 6M41 40h12l5 6M39 44l8 6 2 8" fill="none" stroke="${SHADOW}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="39" r="11" fill="${SHADOW}" ${outline}/><circle cx="28" cy="37" r="3" fill="${BONE}"/><circle cx="36" cy="37" r="3" fill="${BONE}"/><circle cx="28.6" cy="37.6" r="1.4" fill="${INK}"/><circle cx="36.6" cy="37.6" r="1.4" fill="${INK}"/>${blush(25, 39, 43)}${smile(30, 44, 2, BONE)}</symbol>`,
  web: `<symbol id="i-web" viewBox="0 0 100 100">${cobweb()}</symbol>`,
  cauldron: `<symbol id="i-cauldron" viewBox="0 0 64 64"><circle cx="23" cy="13" r="4" fill="${SLIME}" ${outline}/><circle cx="35" cy="8" r="3" fill="${SLIME}" ${outline}/><circle cx="40" cy="17" r="2.4" fill="${SLIME}" ${outline}/><path d="M17 54l-3 7M47 54l3 7" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M10 29h44c2 17-6 27-22 27S8 46 10 29z" fill="${PLUM}" ${outline}/><ellipse cx="32" cy="28" rx="25" ry="6.5" fill="${SLIME}" ${outline}/>${dotEyes(25, 39, 40, 2.3, BONE)}${blush(20, 44, 45)}${smile(29, 45, 3, BONE)}</symbol>`,
  heart: `<symbol id="i-heart" viewBox="0 0 64 64"><path d="M32 55S7 41 7 24c0-8 6-13 12.5-13 5 0 9.5 3 12.5 8 3-5 7.5-8 12.5-8C51 11 57 16 57 24c0 17-25 31-25 31z" fill="${ROSE}" ${outline}/><path d="M16 22q1-5 6-5" fill="none" stroke="${BONE}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/></symbol>`,
  crystal: `<symbol id="i-crystal" viewBox="0 0 64 64"><path d="M16 52h32l4 8H12z" fill="${PLUM}" ${outline}/><circle cx="32" cy="32" r="20" fill="${LAVENDER}" ${outline}/><path d="M22 24q3-7 10-8" fill="none" stroke="${BONE}" stroke-width="3" stroke-linecap="round" opacity=".8"/><path d="M38 30l1.5 3.5L43 35l-3.5 1.5L38 40l-1.5-3.5L33 35l3.5-1.5z" fill="${BONE}"/><circle cx="27" cy="38" r="1.6" fill="${BONE}"/></symbol>`,
  candle: `<symbol id="i-candle" viewBox="0 0 64 64"><path d="M32 6c5 6 6 10 3 14s-8 2-8-2 3-6 5-12z" fill="${GOLD}" ${outline}/><path d="M22 26h20v28a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3z" fill="${BONE}" ${outline}/><path d="M22 30c4 0 4 6 8 6s3-6 6-6 3 4 6 4" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>${dotEyes(28.5, 35.5, 42, 1.8)}${smile(30.5, 46, 1.5)}</symbol>`,
  tattoo: `<symbol id="i-tattoo" viewBox="0 0 120 120"><g transform="rotate(9 86 40)"><rect x="64" y="12" width="44" height="56" rx="4" fill="${BONE}" ${outline}/><path d="M86 28c-3-6-12-4-11 3 1 6 11 12 11 12s10-6 11-12c1-7-8-9-11-3z" fill="${ROSE}" ${outline}/><path d="M86 18v6M86 46v14" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><path d="M82 46h8" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><path d="M71 60c4-3 7 1 11-1M90 61c4-2 8 1 12-1" fill="none" stroke="${LAVENDER}" stroke-width="2" stroke-linecap="round"/></g><path d="M20 108V64a27 27 0 0 1 54 0v44l-9-6-9 6-9-6-9 6-9-6-9 6z" fill="${BONE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${dotEyes(38, 56, 64, 3.6)}<circle cx="39.2" cy="62.8" r="1.2" fill="${BONE}"/><circle cx="57.2" cy="62.8" r="1.2" fill="${BONE}"/><ellipse cx="32" cy="72" rx="4" ry="2.4" fill="${ROSE}"/><ellipse cx="62" cy="72" rx="4" ry="2.4" fill="${ROSE}"/><path d="M43 70q4 4 8 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M41 90c-2-3-6-2-5.5 1.5.5 3 5.5 6 5.5 6s5-3 5.5-6c.5-3.5-3.5-4.5-5.5-1.5z" fill="none" stroke="${PLUM}" stroke-width="2.2" stroke-dasharray="3 2.2" stroke-linejoin="round"/><g transform="translate(84 62) rotate(36)"><rect x="-7" y="0" width="14" height="20" rx="3.5" fill="${LAVENDER}" ${outline}/><circle cx="0" cy="7" r="3.4" fill="${PLUM}" ${outline}/><circle cx="0" cy="14.5" r="2.4" fill="${GOLD}" ${outline}/><rect x="-4" y="20" width="8" height="17" rx="3" fill="${PLUM}" ${outline}/><path d="M-4 25h8M-4 30h8" stroke="${LAVENDER}" stroke-width="1.4"/><path d="M0 37v8" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M7 4c6-4 10 0 14-6" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></g><ellipse cx="72" cy="90" rx="6" ry="5" fill="${BONE}" ${outline}/><path d="M56 101c0-2 2-4 2-4s2 2 2 4a2 2 0 0 1-4 0z" fill="${PLUM}"/><path d="M14 30l1.6 3.6L19 35l-3.4 1.4L14 40l-1.6-3.6L9 35l3.4-1.4z" fill="${GOLD}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M104 88l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="${LAVENDER}"/><circle cx="30" cy="20" r="2" fill="${ROSE}"/></symbol>`,
};

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  archive: '<path d="M3 5h18v4H3zM5 9v10h14V9M10 13h4"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  exit: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
};

export const COVER_ILLUSTRATIONS = ['tattoo', 'ghost', 'cat', 'bat', 'skull', 'pumpkin', 'vampire', 'monster', 'potion', 'moon', 'mushroom', 'spider', 'cauldron', 'crystal', 'candle', 'heart'];

export function injectSprite() {
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${Object.values(SYMBOLS).join('')}</svg>`;
  document.body.prepend(holder);
}

export function illustration(name, className = '') {
  return `<svg class="ill ${className}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

const STICKER_POOL = ['ghost', 'bat', 'star', 'skull', 'mushroom', 'moon', 'cat', 'pumpkin', 'potion', 'spider', 'candle', 'heart', 'vampire', 'monster'];

function seededRandom(seed) {
  let value = 0;
  for (const char of seed) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function scatterStickers(seed, count = 5) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const name = STICKER_POOL[Math.floor(random() * STICKER_POOL.length)];
    const side = index % 2 === 0 ? 'left' : 'right';
    const offset = (random() * 6 - 2).toFixed(1);
    const top = (8 + (index / count) * 84 + random() * 6).toFixed(1);
    const size = Math.round(28 + random() * 26);
    const rotation = Math.round(random() * 40 - 20);
    const delay = (random() * 4).toFixed(2);
    return `<span class="floating-sticker" style="${side}:${offset}%;top:${top}%;width:${size}px;height:${size}px;--rotate:${rotation}deg;animation-delay:-${delay}s">${illustration(name)}</span>`;
  }).join('');
}
