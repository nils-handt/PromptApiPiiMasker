import { JsonDocumentSource, JsonValueNode } from '../../domain/types';

export async function parseJsonDocument(file: File): Promise<JsonDocumentSource> {
  const rawText = await file.text();
  let data: unknown;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Could not parse JSON file "${file.name}".`);
  }

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mediaType: 'application/json',
    rawText,
    data,
    values: flattenJsonValues(data),
  };
}

export function flattenJsonValues(value: unknown): JsonValueNode[] {
  const values: JsonValueNode[] = [];
  visitJson(value, '$', undefined, values);
  return values;
}

function visitJson(
  value: unknown,
  path: string,
  parentKey: string | undefined,
  values: JsonValueNode[],
): void {
  if (isJsonPrimitive(value)) {
    values.push({ path, parentKey, value });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      visitJson(entry, `${path}[${index}]`, parentKey, values);
    });
    return;
  }

  if (isJsonObject(value)) {
    Object.entries(value).forEach(([key, entry]) => {
      visitJson(entry, appendJsonPathKey(path, key), key, values);
    });
  }
}

function isJsonPrimitive(value: unknown): value is JsonValueNode['value'] {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function appendJsonPathKey(path: string, key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return `${path}.${key}`;
  }

  return `${path}['${key.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}']`;
}
