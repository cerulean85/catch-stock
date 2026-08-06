import { describe, expect, it } from 'vitest';
import { TEMPLATES, TEMPLATE_KEYS, isTemplateKey } from './templates';

describe('journal templates', () => {
  it('exposes a body for every template key', () => {
    for (const key of TEMPLATE_KEYS) {
      expect(TEMPLATES[key]).toBeTruthy();
      expect(TEMPLATES[key].length).toBeGreaterThan(10);
    }
  });

  it('isTemplateKey narrows valid strings', () => {
    expect(isTemplateKey('buy')).toBe(true);
    expect(isTemplateKey('analysis')).toBe(true);
    expect(isTemplateKey('reflection')).toBe(true);
    expect(isTemplateKey('unknown')).toBe(false);
    expect(isTemplateKey(123)).toBe(false);
    expect(isTemplateKey(undefined)).toBe(false);
  });
});
