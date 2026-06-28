import { PII_CATEGORIES, type PiiCategory } from '../../domain/types';

export interface ValidatedPromptFinding {
  id: string;
  category: PiiCategory;
  originalValue: string;
  confidence: number;
  path: string;
}

export type ShapeValidationResult =
  | { valid: true; findings: ValidatedPromptFinding[] }
  | { valid: false; error: string };

interface ModelFindingCandidate {
  id?: unknown;
  category?: unknown;
  originalValue?: unknown;
  confidence?: unknown;
  path?: unknown;
}

interface ModelResponseCandidate {
  findings?: unknown;
}

export function validateJsonAnalysisResponseShape(
  responseText: string,
  validPaths: ReadonlySet<string>,
): ShapeValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText.trim());
  } catch {
    return { valid: false, error: 'Response must be a valid JSON object.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Response must be a valid JSON object.' };
  }

  const response = parsed as ModelResponseCandidate;

  if (!Array.isArray(response.findings)) {
    return { valid: false, error: 'Response must include a findings array.' };
  }

  const findings: ValidatedPromptFinding[] = [];

  for (const [index, rawFinding] of response.findings.entries()) {
    const findingNumber = index + 1;

    if (!rawFinding || typeof rawFinding !== 'object' || Array.isArray(rawFinding)) {
      return { valid: false, error: `Finding ${findingNumber} must be an object.` };
    }

    const finding = rawFinding as ModelFindingCandidate;

    if (typeof finding.id !== 'string') {
      return { valid: false, error: `Finding ${findingNumber} id must be a string.` };
    }

    if (!isPiiCategory(finding.category)) {
      return { valid: false, error: `Finding ${findingNumber} must use an allowed category.` };
    }

    if (typeof finding.originalValue !== 'string') {
      return { valid: false, error: `Finding ${findingNumber} originalValue must be a string.` };
    }

    if (
      typeof finding.confidence !== 'number' ||
      !Number.isFinite(finding.confidence) ||
      finding.confidence < 0 ||
      finding.confidence > 1
    ) {
      return { valid: false, error: `Finding ${findingNumber} confidence must be a number from 0 to 1.` };
    }

    if (typeof finding.path !== 'string') {
      return { valid: false, error: `Finding ${findingNumber} path must be a string.` };
    }

    if (!validPaths.has(finding.path)) {
      return { valid: false, error: `Finding ${findingNumber} must use a path from the sample JSON.` };
    }

    findings.push({
      id: finding.id,
      category: finding.category,
      originalValue: finding.originalValue,
      confidence: finding.confidence,
      path: finding.path,
    });
  }

  return { valid: true, findings };
}

function isPiiCategory(value: unknown): value is PiiCategory {
  return typeof value === 'string' && PII_CATEGORIES.includes(value as PiiCategory);
}
