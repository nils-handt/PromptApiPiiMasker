import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

describe('layout styles', () => {
  it('keeps workbench columns independently sized and scrolls long findings lists', () => {
    expect(styles).toMatch(/\.workbench-grid\s*{[^}]*align-items:\s*start;/s);
    expect(styles).toMatch(/\.findings-panel\s*{[^}]*max-height:\s*calc\(100vh - 128px\);/s);
    expect(styles).toMatch(/\.findings-panel\s*{[^}]*overflow-y:\s*auto;/s);
  });
});
