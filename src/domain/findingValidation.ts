import { PII_CATEGORIES } from './types';
import type { Finding, FindingLocation, MaskingAction, PiiCategory } from './types';

interface RawFinding {
  id?: unknown;
  category?: unknown;
  originalValue?: unknown;
  confidence?: unknown;
  location?: unknown;
  detectionSource?: unknown;
  selectedAction?: unknown;
}

const DEFAULT_ACTION_BY_CATEGORY: Record<PiiCategory, MaskingAction> = {
  name: 'replace-fake',
  address: 'replace-fake',
  phone: 'replace-label',
  email: 'replace-label',
  iban: 'replace-label',
  bic: 'replace-label',
  'credit-card': 'redact',
  'government-id': 'redact',
  'date-of-birth': 'replace-label',
  organization: 'replace-fake',
  'other-sensitive': 'redact',
};

export function normalizeFinding(raw: unknown): Finding {
  const candidate = normalizeFindingInput(raw);
  const category = normalizeCategory(candidate.category);
  const location = normalizeLocation(candidate.location);
  const detectionSource = normalizeDetectionSource(candidate.detectionSource);

  if (detectionSource === 'json-path' && location.kind !== 'json-path') {
    throw new Error('JSON path findings must include a JSON path location.');
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : crypto.randomUUID(),
    category,
    originalValue: typeof candidate.originalValue === 'string' ? candidate.originalValue : undefined,
    confidence: normalizeConfidence(candidate.confidence),
    location,
    detectionSource,
    reviewStatus: 'pending',
    selectedAction: normalizeAction(candidate.selectedAction, category),
    replacementValue: undefined,
  };
}

function normalizeFindingInput(value: unknown): RawFinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Finding must be an object.');
  }

  return value as RawFinding;
}

function normalizeCategory(value: unknown): PiiCategory {
  if (typeof value !== 'string') {
    throw new Error('Finding category must be a string.');
  }

  if (!PII_CATEGORIES.includes(value as PiiCategory)) {
    throw new Error(`Unsupported category: ${value}`);
  }

  return value as PiiCategory;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeDetectionSource(value: unknown): Finding['detectionSource'] {
  if (value === 'json-path' || value === 'text' || value === 'visual') {
    return value;
  }

  throw new Error('Finding detection source must be json-path, text, or visual.');
}

function normalizeAction(value: unknown, category: PiiCategory): MaskingAction {
  if (value === undefined || value === null) {
    return DEFAULT_ACTION_BY_CATEGORY[category];
  }

  if (value === 'redact' || value === 'replace-label' || value === 'replace-fake' || value === 'ignore') {
    return value;
  }

  throw new Error('Finding selected action must be redact, replace-label, replace-fake, or ignore.');
}

function normalizeLocation(value: unknown): FindingLocation {
  if (value === undefined || value === null) {
    return { kind: 'none' };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid location.');
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.kind === 'json-path' && typeof candidate.path === 'string' && candidate.path.startsWith('$')) {
    return { kind: 'json-path', path: candidate.path };
  }

  if (
    candidate.kind === 'text-range' &&
    isFiniteInteger(candidate.start) &&
    isFiniteInteger(candidate.end) &&
    candidate.start >= 0 &&
    candidate.end > candidate.start
  ) {
    return { kind: 'text-range', start: candidate.start, end: candidate.end };
  }

  if (
    candidate.kind === 'region' &&
    isFiniteNumber(candidate.x) &&
    isFiniteNumber(candidate.y) &&
    isFiniteNumber(candidate.width) &&
    isFiniteNumber(candidate.height) &&
    candidate.width > 0 &&
    candidate.height > 0 &&
    (candidate.page === undefined || isFiniteInteger(candidate.page))
  ) {
    return {
      kind: 'region',
      page: typeof candidate.page === 'number' ? candidate.page : undefined,
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
    };
  }

  if (candidate.kind === 'none') {
    return { kind: 'none' };
  }

  throw new Error('Invalid location.');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteInteger(value: unknown): value is number {
  return Number.isInteger(value);
}
