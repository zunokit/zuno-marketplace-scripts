/**
 * Tests for src/utils/csv.utils.ts.
 *
 * Uses Node's built-in test runner (node:test) — no Jest config needed.
 * Run via `pnpm test`, which invokes `tsx` to transpile TS on the fly.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { toCsv, fromCsv } from '../../src/utils/csv.utils';

describe('toCsv — happy path', () => {
  it('emits header + rows from an array of objects', () => {
    const csv = toCsv([
      { address: '0xabc', volume: 1.5 },
      { address: '0xdef', volume: 2.25 },
    ]);
    assert.equal(csv, 'address,volume\r\n0xabc,1.5\r\n0xdef,2.25\r\n');
  });

  it('respects explicit column order and header labels', () => {
    const csv = toCsv(
      [
        { address: '0xabc', volume: 1.5 },
        { address: '0xdef', volume: 2.25 },
      ],
      {
        columns: [
          { key: 'volume', header: 'Volume (ETH)' },
          { key: 'address', header: 'Wallet' },
        ],
      },
    );
    assert.equal(
      csv,
      'Volume (ETH),Wallet\r\n1.5,0xabc\r\n2.25,0xdef\r\n',
    );
  });

  it('emits no header for array rows', () => {
    const csv = toCsv([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    assert.equal(csv, '1,2,3\r\n4,5,6\r\n');
  });

  it('supports TSV via custom separator', () => {
    const csv = toCsv([{ a: 1, b: 2 }], { separator: '\t' });
    assert.equal(csv, 'a\tb\r\n1\t2\r\n');
  });

  it('prepends UTF-8 BOM when bom=true', () => {
    const csv = toCsv([{ a: 1 }], { bom: true });
    assert.equal(csv.charCodeAt(0), 0xfeff);
  });
});

describe('toCsv — escaping & coercion', () => {
  it('quotes fields containing the separator', () => {
    const csv = toCsv([{ name: 'Pham, Hoa', address: '0x1' }]);
    assert.equal(csv, 'name,address\r\n"Pham, Hoa",0x1\r\n');
  });

  it('quotes and escapes embedded double quotes', () => {
    const csv = toCsv([{ comment: 'say "hi"' }]);
    assert.equal(csv, 'comment\r\n"say ""hi"""\r\n');
  });

  it('quotes fields containing newlines', () => {
    const csv = toCsv([{ note: 'line1\nline2' }]);
    assert.equal(csv, 'note\r\n"line1\nline2"\r\n');
  });

  it('coerces null / undefined to empty string', () => {
    const csv = toCsv([{ a: null, b: undefined, c: 1 }]);
    assert.equal(csv, 'a,b,c\r\n,,1\r\n');
  });

  it('coerces bigint to decimal string', () => {
    const csv = toCsv([{ amount: BigInt('12345678901234567890') }]);
    assert.equal(csv, 'amount\r\n12345678901234567890\r\n');
  });

  it('coerces booleans to true/false', () => {
    const csv = toCsv([{ ok: true, bad: false }]);
    assert.equal(csv, 'ok,bad\r\ntrue,false\r\n');
  });

  it('coerces Date to ISO 8601', () => {
    const csv = toCsv([{ at: new Date('2026-05-20T07:00:00Z') }]);
    assert.equal(csv, 'at,\r\n2026-05-20T07:00:00.000Z,\r\n'.replace(',\r\n', '\r\n').replace(/,$/m, ''));
    // Cleaner assertion below — recompute since pipe above is fragile.
    const csv2 = toCsv([{ at: new Date('2026-05-20T07:00:00Z') }]);
    assert.equal(csv2, 'at\r\n2026-05-20T07:00:00.000Z\r\n');
  });

  it('returns empty string for empty input without columns', () => {
    assert.equal(toCsv([]), '');
  });

  it('emits only header row when given empty rows with explicit columns', () => {
    const csv = toCsv([], {
      columns: [{ key: 'a' }, { key: 'b', header: 'B' }],
    });
    assert.equal(csv, 'a,B\r\n');
  });
});

describe('fromCsv', () => {
  it('round-trips a simple header + rows back to objects', () => {
    const csv = 'address,volume\r\n0xabc,1.5\r\n0xdef,2.25\r\n';
    const rows = fromCsv(csv) as Array<Record<string, string>>;
    assert.deepEqual(rows, [
      { address: '0xabc', volume: '1.5' },
      { address: '0xdef', volume: '2.25' },
    ]);
  });

  it('handles quoted fields with commas, quotes, and newlines', () => {
    const csv =
      'name,comment\r\n"Pham, Hoa","say ""hi"""\r\n"Two-liner","line1\nline2"\r\n';
    const rows = fromCsv(csv) as Array<Record<string, string>>;
    assert.deepEqual(rows, [
      { name: 'Pham, Hoa', comment: 'say "hi"' },
      { name: 'Two-liner', comment: 'line1\nline2' },
    ]);
  });

  it('returns string[][] when hasHeader=false', () => {
    const csv = '1,2,3\r\n4,5,6\r\n';
    const rows = fromCsv(csv, { hasHeader: false }) as string[][];
    assert.deepEqual(rows, [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });

  it('returns string[][] when asObjects=false', () => {
    const csv = 'a,b\r\n1,2\r\n';
    const rows = fromCsv(csv, { asObjects: false }) as string[][];
    assert.deepEqual(rows, [
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('parses TSV via custom separator', () => {
    const csv = 'a\tb\r\n1\t2\r\n';
    const rows = fromCsv(csv, { separator: '\t' }) as Array<
      Record<string, string>
    >;
    assert.deepEqual(rows, [{ a: '1', b: '2' }]);
  });

  it('strips a UTF-8 BOM at the start', () => {
    const csv = '\uFEFFa,b\r\n1,2\r\n';
    const rows = fromCsv(csv) as Array<Record<string, string>>;
    assert.deepEqual(rows, [{ a: '1', b: '2' }]);
  });

  it('returns [] for empty input with hasHeader=true', () => {
    assert.deepEqual(fromCsv(''), []);
  });

  it('accepts LF-only line endings', () => {
    const rows = fromCsv('a,b\n1,2\n3,4\n') as Array<Record<string, string>>;
    assert.deepEqual(rows, [
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('round-trips a non-trivial dataset', () => {
    const original = [
      { address: '0xabc', label: 'first, second', notes: 'a "b" c\nline2' },
      { address: '0xdef', label: 'plain', notes: '' },
    ];
    const csv = toCsv(original);
    const decoded = fromCsv(csv) as Array<Record<string, string>>;
    assert.deepEqual(decoded, [
      { address: '0xabc', label: 'first, second', notes: 'a "b" c\nline2' },
      { address: '0xdef', label: 'plain', notes: '' },
    ]);
  });
});
