import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACRO_DERIVED } from './derived';
import { MANUAL_METRICS } from './metrics-manual';
import { MACRO_METRICS } from './metrics';
import { MACRO_GROUPS, type MacroGroupId } from './types';

/**
 * 이 카탈로그는 docs/spec/macro-metrics.md를 옮겨 적은 것이다. 한쪽만 고치면
 * 화면에는 티가 안 나므로, 두 파일이 같은 지표를 담고 있는지 여기서 잡는다.
 */
const SPEC = readFileSync('docs/spec/macro-metrics.md', 'utf8');

const ids = MACRO_METRICS.map((m) => m.id);
/** linkedTo는 파생 지표도 가리킬 수 있다. */
const linkable = [...ids, ...MACRO_DERIVED.map((d) => d.id)];
const groupIds = MACRO_GROUPS.map((g) => g.id);

describe('MACRO_METRICS', () => {
  it('id가 중복되지 않는다', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 지표가 PDF의 6분류 중 하나에 속한다', () => {
    for (const metric of MACRO_METRICS) {
      expect(groupIds).toContain(metric.group);
    }
  });

  it('6분류에 빈 그룹이 없다', () => {
    for (const group of groupIds) {
      const inGroup = MACRO_METRICS.filter((m) => m.group === group);
      expect(inGroup.length, `${group} 그룹이 비어 있다`).toBeGreaterThan(0);
    }
  });

  it('그룹 순서대로 묶여 있다', () => {
    // MACRO_METRICS는 자동·수동을 합쳐 만든다. 합치는 과정에서 화면 순서가 흐트러지면 안 된다.
    const order = MACRO_METRICS.map((m) => groupIds.indexOf(m.group));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('수동 확인 항목이 빠짐없이 들어간다', () => {
    for (const manual of MANUAL_METRICS) {
      expect(ids, `${manual.id}가 누락됐다`).toContain(manual.id);
    }
  });

  it('판정 기준(watch)이 비어 있는 지표가 없다', () => {
    // watch가 없으면 대시보드에서 숫자만 보이고 해석이 안 된다.
    for (const metric of MACRO_METRICS) {
      expect(metric.watch.trim(), `${metric.id}에 watch가 없다`).not.toBe('');
    }
  });

  it('자동 수집 지표에는 seriesId가, 수동 지표에는 확인처가 있다', () => {
    for (const metric of MACRO_METRICS) {
      if (metric.source === 'manual') {
        expect(metric.href, `${metric.id}에 확인처가 없다`).toBeTruthy();
      } else {
        expect(metric.seriesId, `${metric.id}에 seriesId가 없다`).toBeTruthy();
      }
    }
  });

  it('linkedTo가 실재하는 지표만 가리킨다', () => {
    for (const metric of MACRO_METRICS) {
      for (const target of metric.linkedTo) {
        expect(linkable, `${metric.id} → ${target}`).toContain(target);
      }
      // 자기 자신을 가리키는 연결은 톱니바퀴가 아니다.
      expect(metric.linkedTo).not.toContain(metric.id);
    }
  });

  it('스펙 문서에 모든 지표 id가 적혀 있다', () => {
    for (const id of ids) {
      expect(SPEC, `스펙에 ${id}가 없다`).toContain(`\`${id}\``);
    }
  });
});

describe('MACRO_DERIVED', () => {
  it('파생 지표의 입력이 실재하는 지표다', () => {
    for (const derived of MACRO_DERIVED) {
      for (const input of derived.inputs) {
        expect(ids, `${derived.id} ← ${input}`).toContain(input);
      }
    }
  });

  it('순유동성은 연준 자산에서 TGA와 RRP를 뺀다', () => {
    // PDF 결론의 핵심 톱니. 구성이 바뀌면 유동성 판단 전체가 달라진다.
    const netLiquidity = MACRO_DERIVED.find((d) => d.id === 'net-liquidity');
    expect(netLiquidity?.inputs).toEqual(['fed-balance', 'tga', 'rrp']);
  });
});

describe('MACRO_GROUPS', () => {
  it('PDF 문서 순서를 그대로 따른다', () => {
    const expected: MacroGroupId[] = [
      'real-economy',
      'policy',
      'liquidity',
      'bond',
      'trade-fx',
      'geopolitics',
    ];
    expect(groupIds).toEqual(expected);
  });
});
