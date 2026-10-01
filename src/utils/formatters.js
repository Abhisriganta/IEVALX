import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export const formatSalary = (min, max, currency = '$') => {
  const fmt = (n) => n >= 1000 ? `${currency}${(n / 1000).toFixed(0)}k` : `${currency}${n}`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min)        return `From ${fmt(min)}`;
  if (max)        return `Up to ${fmt(max)}`;
  return 'Not disclosed';
};

export const formatDate = (date, format = 'MMM D, YYYY') =>
  date ? dayjs(date).format(format) : '—';

export const formatRelativeTime = (date) =>
  date ? dayjs(date).fromNow() : '—';

export const formatDateRange = (start, end) => {
  if (!start) return '—';
  const s = dayjs(start).format('MMM YYYY');
  const e = end ? dayjs(end).format('MMM YYYY') : 'Present';
  return `${s} – ${e}`;
};

export const formatDuration = (months) => {
  if (!months) return '—';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y}yr`);
  if (m) parts.push(`${m}mo`);
  return parts.join(' ');
};

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
};

export const formatScore = (score, max = 100) =>
  score !== null && score !== undefined ? `${score}/${max}` : '—';

export const formatName = (first, last) =>
  [first, last].filter(Boolean).join(' ') || '—';

export const getInitials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

export const truncate = (str, len = 120) =>
  str?.length > len ? `${str.slice(0, len)}…` : (str || '');

export const formatJobType = (type) => {
  const map = {
    full_time: 'Full-time', part_time: 'Part-time',
    contract: 'Contract', internship: 'Internship', freelance: 'Freelance',
  };
  return map[type] || type || '—';
};

export const formatExperience = (years) => {
  if (!years && years !== 0) return '—';
  if (years === 0) return 'Fresher';
  if (years === 1) return '1 year';
  return `${years} years`;
};