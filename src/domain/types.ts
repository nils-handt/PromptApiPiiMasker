export const PII_CATEGORIES = [
  'name',
  'address',
  'phone',
  'email',
  'iban',
  'bic',
  'credit-card',
  'government-id',
  'date-of-birth',
  'organization',
  'other-sensitive',
] as const;

export type PiiCategory = (typeof PII_CATEGORIES)[number];

export type DetectionSource = 'json-path' | 'text' | 'visual';

export type ReviewStatus = 'pending' | 'approved' | 'ignored' | 'needs-location-review';

export type MaskingAction = 'redact' | 'replace-label' | 'replace-fake' | 'ignore';

export type FindingLocation =
  | { kind: 'json-path'; path: string }
  | { kind: 'text-range'; start: number; end: number }
  | { kind: 'region'; page?: number; x: number; y: number; width: number; height: number }
  | { kind: 'none' };

export interface Finding {
  id: string;
  category: PiiCategory;
  originalValue?: string;
  confidence: number;
  location: FindingLocation;
  detectionSource: DetectionSource;
  reviewStatus: ReviewStatus;
  selectedAction: MaskingAction;
  replacementValue?: string;
}

export interface DocumentSource {
  id: string;
  fileName: string;
  mediaType: 'application/json' | 'image' | 'application/pdf';
}

export interface JsonDocumentSource extends DocumentSource {
  mediaType: 'application/json';
  rawText: string;
  data: unknown;
  values: JsonValueNode[];
}

export interface ImageDocumentSource extends DocumentSource {
  mediaType: 'image';
  file: File;
  mimeType: string;
  objectUrl: string;
  width: number;
  height: number;
}

export type AnalyzableDocumentSource = JsonDocumentSource | ImageDocumentSource;

export interface JsonValueNode {
  path: string;
  value: string | number | boolean | null;
  parentKey?: string;
}

export interface ExportReportEntry {
  sourceFileName: string;
  findingId: string;
  category: PiiCategory;
  originalValue?: string;
  action: MaskingAction;
  replacementValue?: string;
  detectionSource: DetectionSource;
  status: 'exported' | 'ignored' | 'not-applied';
}
