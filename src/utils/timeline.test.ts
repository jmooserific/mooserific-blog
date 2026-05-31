import { describe, it, expect } from 'vitest';
import {
  buildTimelineModel,
  monthToFrac,
  fracToMonth,
  clampMonth,
  dateToFrac,
  fracToDateISO,
  nearestIndexByDate,
  type TimelineModel,
} from './timeline';

describe('buildTimelineModel', () => {
  it('returns null for an empty archive', () => {
    expect(buildTimelineModel({})).toBeNull();
  });

  it('ignores year-total and zero/negative keys', () => {
    // "2020" (year total) and a zero month must not establish the span.
    const model = buildTimelineModel({ '2020': 5, '2021-03': 0, '2021-06': 2 });
    expect(model).not.toBeNull();
    expect(model!.startYear).toBe(2021);
    expect(model!.endYear).toBe(2021);
  });

  it('spans every month between first and last post, filling gaps with zero', () => {
    const model = buildTimelineModel({ '2018-01': 1, '2019-12': 4 })!;
    expect(model.startYear).toBe(2018);
    expect(model.endYear).toBe(2019);
    expect(model.totalMonths).toBe(24);
    expect(model.counts).toHaveLength(24);
    expect(model.counts[0]).toBe(1); // 2018-01
    expect(model.counts[23]).toBe(4); // 2019-12
    expect(model.counts[10]).toBe(0); // a gap month
    expect(model.maxCount).toBe(4);
  });

  it('floors maxCount at 1', () => {
    const model = buildTimelineModel({ '2022-05': 1 })!;
    expect(model.maxCount).toBe(1);
    expect(model.totalMonths).toBe(12);
  });
});

describe('monthToFrac / fracToMonth', () => {
  const total = 24;

  it('places a month at its centre fraction', () => {
    expect(monthToFrac(0, total)).toBeCloseTo(0.5 / 24);
    expect(monthToFrac(23, total)).toBeCloseTo(23.5 / 24);
  });

  it('round-trips through fracToMonth', () => {
    for (const m of [0, 1, 11, 12, 23]) {
      expect(fracToMonth(monthToFrac(m, total), total)).toBe(m);
    }
  });

  it('clamps fractions at the ends', () => {
    expect(fracToMonth(-0.5, total)).toBe(0);
    expect(fracToMonth(1.5, total)).toBe(total - 1);
  });
});

describe('clampMonth', () => {
  it('clamps below, within, and above the span', () => {
    expect(clampMonth(-3, 12)).toBe(0);
    expect(clampMonth(5, 12)).toBe(5);
    expect(clampMonth(99, 12)).toBe(11);
  });
});

describe('dateToFrac', () => {
  const model: TimelineModel = {
    startYear: 2018,
    endYear: 2019,
    totalMonths: 24,
    counts: new Array(24).fill(0),
    maxCount: 1,
  };

  it('uses UTC, independent of the runner timezone', () => {
    // 2018-01-01 sits at the very start of the span.
    expect(dateToFrac('2018-01-01T00:00:00.000Z', model)).toBeCloseTo(0);
  });

  it('positions a mid-span month proportionally', () => {
    // 2019-01-01 is the start of month index 12 of 24.
    expect(dateToFrac('2019-01-01T00:00:00.000Z', model)).toBeCloseTo(12 / 24);
  });

  it('clamps dates outside the span to the ends', () => {
    expect(dateToFrac('2010-06-01T00:00:00.000Z', model)).toBe(0);
    expect(dateToFrac('2030-06-01T00:00:00.000Z', model)).toBe(1);
  });

  it('returns 0 for an unparseable date', () => {
    expect(dateToFrac('not-a-date', model)).toBe(0);
  });
});

describe('fracToDateISO', () => {
  const model: TimelineModel = {
    startYear: 2018,
    endYear: 2019,
    totalMonths: 24,
    counts: new Array(24).fill(0),
    maxCount: 1,
  };

  it('maps the ends of the span', () => {
    expect(fracToDateISO(0, model)).toBe('2018-01-01T00:00:00.000Z');
    expect(fracToDateISO(1, model)).toBe('2020-01-01T00:00:00.000Z');
  });

  it('maps the midpoint to the span centre', () => {
    expect(fracToDateISO(0.5, model)).toBe('2019-01-01T00:00:00.000Z');
  });

  it('clamps out-of-range fractions', () => {
    expect(fracToDateISO(-1, model)).toBe('2018-01-01T00:00:00.000Z');
    expect(fracToDateISO(2, model)).toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('nearestIndexByDate', () => {
  // Date-DESC index, the shape listPostIndex returns (newest first).
  const index = [
    { date: '2024-06-01T00:00:00.000Z' },
    { date: '2022-03-15T00:00:00.000Z' },
    { date: '2020-01-10T00:00:00.000Z' },
    { date: '2018-12-31T00:00:00.000Z' },
  ];

  it('returns -1 for an empty index', () => {
    expect(nearestIndexByDate([], '2020-01-01T00:00:00.000Z')).toBe(-1);
  });

  it('finds an exact match', () => {
    expect(nearestIndexByDate(index, '2020-01-10T00:00:00.000Z')).toBe(2);
  });

  it('snaps to the nearest post in a gap', () => {
    // Closer to 2022-03 than to 2020-01.
    expect(nearestIndexByDate(index, '2021-11-01T00:00:00.000Z')).toBe(1);
    // Closer to 2020-01 than to 2022-03.
    expect(nearestIndexByDate(index, '2020-06-01T00:00:00.000Z')).toBe(2);
  });

  it('clamps past the newest and oldest ends', () => {
    expect(nearestIndexByDate(index, '2030-01-01T00:00:00.000Z')).toBe(0);
    expect(nearestIndexByDate(index, '2000-01-01T00:00:00.000Z')).toBe(index.length - 1);
  });

  it('falls back to the newest for an unparseable target', () => {
    expect(nearestIndexByDate(index, 'not-a-date')).toBe(0);
  });
});
