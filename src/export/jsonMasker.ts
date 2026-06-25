import { type Finding, type JsonDocumentSource } from '../domain/types';

export function applyJsonMasking(document: JsonDocumentSource, findings: Finding[]): unknown {
  let clone = structuredClone(document.data);

  findings
    .filter((finding) => finding.reviewStatus === 'approved')
    .filter((finding) => finding.location.kind === 'json-path')
    .forEach((finding) => {
      if (finding.location.kind === 'json-path') {
        clone = setJsonPathValue(clone, finding.location.path, valueForFinding(finding));
      }
    });

  return clone;
}

function valueForFinding(finding: Finding): string {
  if (finding.selectedAction === 'redact') {
    return '████';
  }

  if (finding.selectedAction === 'replace-label' || finding.selectedAction === 'replace-fake') {
    return finding.replacementValue ?? '████';
  }

  return finding.originalValue ?? '';
}

function setJsonPathValue(root: unknown, path: string, value: unknown): unknown {
  const segments = parseJsonPath(path);

  if (segments.length === 0) {
    return value;
  }

  let cursor = root as Record<string, unknown> | unknown[];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const next = cursor[segment as keyof typeof cursor] as Record<string, unknown> | unknown[] | undefined;

    if (next === undefined || next === null || typeof next !== 'object') {
      return root;
    }

    cursor = next;
  }

  const finalSegment = segments[segments.length - 1];
  cursor[finalSegment as keyof typeof cursor] = value as never;
  return root;
}

export function parseJsonPath(path: string): Array<string | number> {
  if (!path.startsWith('$')) {
    throw new Error(`Invalid JSON path: ${path}`);
  }

  const segments: Array<string | number> = [];
  let index = 1;

  while (index < path.length) {
    const char = path[index];

    if (char === '.') {
      const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(path.slice(index + 1));
      if (!match) {
        throw new Error(`Invalid JSON path: ${path}`);
      }

      segments.push(match[0]);
      index += match[0].length + 1;
      continue;
    }

    if (char === '[') {
      const parsed = parseBracketSegment(path, index);
      segments.push(parsed.segment);
      index = parsed.nextIndex;
      continue;
    }

    throw new Error(`Invalid JSON path: ${path}`);
  }

  return segments;
}

function parseBracketSegment(path: string, startIndex: number): { segment: string | number; nextIndex: number } {
  const nextChar = path[startIndex + 1];

  if (nextChar === "'") {
    return parseQuotedBracketSegment(path, startIndex);
  }

  const match = /^\[(\d+)\]/.exec(path.slice(startIndex));
  if (!match) {
    throw new Error(`Invalid JSON path: ${path}`);
  }

  return {
    segment: Number(match[1]),
    nextIndex: startIndex + match[0].length,
  };
}

function parseQuotedBracketSegment(path: string, startIndex: number): { segment: string; nextIndex: number } {
  let value = '';
  let index = startIndex + 2;

  while (index < path.length) {
    const char = path[index];

    if (char === '\\') {
      const escaped = path[index + 1];
      if (escaped === undefined) {
        throw new Error(`Invalid JSON path: ${path}`);
      }

      value += escaped;
      index += 2;
      continue;
    }

    if (char === "'") {
      if (path[index + 1] !== ']') {
        throw new Error(`Invalid JSON path: ${path}`);
      }

      return { segment: value, nextIndex: index + 2 };
    }

    value += char;
    index += 1;
  }

  throw new Error(`Invalid JSON path: ${path}`);
}
