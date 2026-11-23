import { addDays, daysBetween, escapeHtml, formatDate, formatHours, formatShortDate, parseIsoDate, toIsoDate, todayIso } from './format.js';
import { cumulativeByDate } from './model.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function progressRing(ratio, color, { size = 96, stroke = 9, label = '' } = {}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, ratio)) * circumference;
  return `
    <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(label)}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
      ${dash > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
    </svg>`;
}

function niceCeil(value) {
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => candidate >= normalized);
  return step * magnitude;
}

function ticks(max, count) {
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= rawStep);
  const values = [];
  for (let value = 0; value <= max + 1e-9; value += step) values.push(Math.round(value * 100) / 100);
  return values;
}

export function buildJourneySeries(challenges, colors, mode) {
  const today = todayIso();
  const origin = mode === 'calendar'
    ? challenges.map((challenge) => challenge.startDate).filter(Boolean).sort()[0] || today
    : null;
  return challenges
    .filter((challenge) => challenge.startDate)
    .map((challenge) => {
      const base = mode === 'calendar' ? origin : challenge.startDate;
      const endDate = challenge.status === 'completed' && challenge.completedDate ? challenge.completedDate : today;
      const startX = daysBetween(base, challenge.startDate);
      const points = [{ x: startX, hours: 0 }];
      cumulativeByDate(challenge).forEach(({ date, minutes }) => {
        points.push({ x: Math.max(startX, daysBetween(base, date)), hours: minutes / 60 });
      });
      const endX = Math.max(points.at(-1).x, daysBetween(base, endDate));
      if (endX > points.at(-1).x) points.push({ x: endX, hours: points.at(-1).hours });
      return { id: challenge.id, title: challenge.title, color: colors.get(challenge.id), base, points, startX, endX, target: challenge.targetHours };
    });
}

function valueAt(series, x) {
  if (x < series.startX || x > series.endX) return null;
  let value = 0;
  series.points.forEach((point) => {
    if (point.x <= x) value = point.hours;
  });
  return value;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export function drawJourneyChart(container, series, mode) {
  container.innerHTML = '';
  const width = Math.max(280, container.clientWidth);
  const showLabels = width >= 560;
  const height = width < 480 ? 240 : 300;
  const margin = { top: 16, right: showLabels ? 132 : 16, bottom: 34, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxX = Math.max(7, ...series.map((item) => item.endX));
  const maxHours = Math.max(0, ...series.flatMap((item) => item.points.map((point) => point.hours)));
  const maxY = niceCeil(maxHours > 70 ? Math.max(maxHours, 100) : maxHours * 1.15);
  const scaleX = (x) => margin.left + (x / maxX) * innerWidth;
  const scaleY = (y) => margin.top + innerHeight - (y / maxY) * innerHeight;
  const originDate = mode === 'calendar' ? series[0]?.base : null;
  const formatX = (x) => (mode === 'calendar' && originDate ? formatShortDate(addDays(originDate, Math.round(x))) : `Day ${Math.round(x) + 1}`);

  const svg = svgElement('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'journey-chart', 'aria-hidden': 'true' });
  const grid = svgElement('g', { class: 'chart-grid' });
  ticks(maxY, 4).forEach((value) => {
    const y = scaleY(value);
    grid.append(svgElement('line', { x1: margin.left, x2: margin.left + innerWidth, y1: y, y2: y }));
    const label = svgElement('text', { x: margin.left - 8, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = `${value}h`;
    grid.append(label);
  });
  ticks(maxX, width < 480 ? 3 : 5).forEach((value) => {
    if (value > maxX) return;
    const label = svgElement('text', { x: scaleX(value), y: height - 10, 'text-anchor': 'middle', class: 'chart-axis-label' });
    label.textContent = formatX(value);
    grid.append(label);
  });
  grid.append(svgElement('line', { x1: margin.left, x2: margin.left + innerWidth, y1: scaleY(0), y2: scaleY(0), class: 'chart-baseline' }));
  if (maxY >= 100) {
    const y = scaleY(100);
    grid.append(svgElement('line', { x1: margin.left, x2: margin.left + innerWidth, y1: y, y2: y, class: 'chart-target' }));
    const label = svgElement('text', { x: margin.left + 6, y: y - 6, class: 'chart-target-label' });
    label.textContent = '100 h finish line';
    grid.append(label);
  }
  svg.append(grid);

  const lines = svgElement('g');
  series.forEach((item) => {
    const d = item.points.map((point, index) => `${index ? 'L' : 'M'}${scaleX(point.x).toFixed(1)} ${scaleY(point.hours).toFixed(1)}`).join('');
    lines.append(svgElement('path', { d, fill: 'none', stroke: item.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  });
  svg.append(lines);

  if (showLabels) {
    const placed = series
      .map((item) => ({ item, y: scaleY(item.points.at(-1).hours), x: scaleX(item.endX) }))
      .sort((a, b) => a.y - b.y);
    placed.forEach((entry, index) => {
      if (index > 0) entry.y = Math.max(entry.y, placed[index - 1].y + 16);
    });
    placed.forEach(({ item, y, x }) => {
      const group = svgElement('g', { class: 'chart-direct-label' });
      group.append(svgElement('circle', { cx: x + 10, cy: y, r: 4, fill: item.color }));
      const text = svgElement('text', { x: x + 18, y: y + 4 });
      text.textContent = item.title.length > 16 ? `${item.title.slice(0, 15)}…` : item.title;
      group.append(text);
      svg.append(group);
    });
  }

  const crosshair = svgElement('g', { class: 'chart-crosshair', visibility: 'hidden' });
  const crosshairLine = svgElement('line', { y1: margin.top, y2: margin.top + innerHeight });
  crosshair.append(crosshairLine);
  const dots = series.map((item) => {
    const dot = svgElement('circle', { r: 5, fill: item.color, stroke: 'var(--surface)', 'stroke-width': 2 });
    crosshair.append(dot);
    return dot;
  });
  svg.append(crosshair);

  const hitArea = svgElement('rect', { x: margin.left, y: margin.top, width: innerWidth, height: innerHeight, fill: 'transparent' });
  svg.append(hitArea);
  container.append(svg);

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.hidden = true;
  container.append(tooltip);

  const move = (event) => {
    const bounds = svg.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const x = Math.round(Math.max(0, Math.min(maxX, ((pointerX - margin.left) / innerWidth) * maxX)));
    const screenX = scaleX(x);
    crosshair.setAttribute('visibility', 'visible');
    crosshairLine.setAttribute('x1', screenX);
    crosshairLine.setAttribute('x2', screenX);
    const rows = series.map((item, index) => {
      const value = valueAt(item, x);
      const dot = dots[index];
      if (value === null) {
        dot.setAttribute('visibility', 'hidden');
        return `<li><span class="swatch" style="background:${item.color}"></span>${escapeHtml(item.title)}<b>—</b></li>`;
      }
      dot.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', screenX);
      dot.setAttribute('cy', scaleY(value));
      return `<li><span class="swatch" style="background:${item.color}"></span>${escapeHtml(item.title)}<b>${formatHours(value * 60)} h</b></li>`;
    });
    const heading = mode === 'calendar' && originDate ? formatDate(addDays(originDate, x)) : `Day ${x + 1} of the journey`;
    tooltip.innerHTML = `<strong>${heading}</strong><ul>${rows.join('')}</ul>`;
    tooltip.hidden = false;
    const tooltipWidth = tooltip.offsetWidth;
    const left = screenX + 14 + tooltipWidth > width ? screenX - 14 - tooltipWidth : screenX + 14;
    tooltip.style.left = `${Math.max(0, left)}px`;
    tooltip.style.top = `${margin.top}px`;
  };
  const leave = () => {
    crosshair.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  };
  hitArea.addEventListener('pointermove', move);
  hitArea.addEventListener('pointerdown', move);
  hitArea.addEventListener('pointerleave', leave);
}

function startOfWeek(iso) {
  const date = parseIsoDate(iso);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return toIsoDate(date);
}

export function weeklyRhythm(challenge, weeks) {
  const currentWeek = startOfWeek(todayIso());
  const firstWeek = addDays(currentWeek, -7 * (weeks - 1));
  const buckets = Array.from({ length: weeks }, (_, index) => ({ week: addDays(firstWeek, index * 7), minutes: 0 }));
  challenge.sessions.forEach((session) => {
    const index = daysBetween(firstWeek, startOfWeek(session.date)) / 7;
    if (index >= 0 && index < weeks) buckets[index].minutes += session.minutes;
  });
  return buckets;
}

export function rhythmLevel(minutes) {
  if (minutes <= 0) return 0;
  if (minutes < 120) return 1;
  if (minutes < 300) return 2;
  if (minutes < 600) return 3;
  return 4;
}
