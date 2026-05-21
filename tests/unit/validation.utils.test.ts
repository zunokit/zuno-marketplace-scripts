/**
 * Tests for src/utils/validation.utils.ts.
 *
 * Uses Node's built-in test runner (node:test) so no extra test framework
 * has to be wired up. Run via `pnpm test` (see package.json), which
 * invokes `tsx` to transpile TypeScript on the fly.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  validateAddress,
  validateBasisPoints,
  validateChoice,
  validateETHAmount,
  validateInteger,
  validateNonEmptyArray,
  validateNonEmptyString,
  validateNonNegativeNumber,
  validatePercentage,
  validatePositiveNumber,
} from '../../src/utils/validation.utils';

const VALID_ADDR = '0x1234567890abcdef1234567890abcdef12345678';

describe('validateAddress', () => {
  it('accepts a well-formed 0x address', () => {
    assert.doesNotThrow(() => validateAddress(VALID_ADDR));
  });

  it('throws when the string is empty', () => {
    assert.throws(() => validateAddress(''), /Address is invalid/);
  });

  it('throws when the address is malformed', () => {
    assert.throws(
      () => validateAddress('not-an-address'),
      /Address is invalid/,
    );
  });

  it('uses the provided field name in the error', () => {
    assert.throws(() => validateAddress('bad', 'Seller'), /Seller is invalid/);
  });
});

describe('validatePositiveNumber', () => {
  it('accepts positive numbers', () => {
    assert.doesNotThrow(() => validatePositiveNumber(1));
    assert.doesNotThrow(() => validatePositiveNumber(0.5));
  });

  it('throws on zero', () => {
    assert.throws(
      () => validatePositiveNumber(0),
      /must be a positive number/,
    );
  });

  it('throws on negative', () => {
    assert.throws(() => validatePositiveNumber(-1));
  });

  it('throws on NaN', () => {
    assert.throws(() => validatePositiveNumber(Number.NaN));
  });
});

describe('validateNonNegativeNumber', () => {
  it('accepts zero', () => {
    assert.doesNotThrow(() => validateNonNegativeNumber(0));
  });

  it('accepts a positive number', () => {
    assert.doesNotThrow(() => validateNonNegativeNumber(42));
  });

  it('throws on negative', () => {
    assert.throws(
      () => validateNonNegativeNumber(-1),
      /must be a non-negative number/,
    );
  });

  it('throws on NaN', () => {
    assert.throws(() => validateNonNegativeNumber(Number.NaN));
  });
});

describe('validateInteger', () => {
  it('accepts integers', () => {
    assert.doesNotThrow(() => validateInteger(0));
    assert.doesNotThrow(() => validateInteger(-3));
    assert.doesNotThrow(() => validateInteger(7));
  });

  it('throws on a fractional value', () => {
    assert.throws(() => validateInteger(1.5), /must be an integer/);
  });

  it('throws on NaN', () => {
    assert.throws(() => validateInteger(Number.NaN));
  });
});

describe('validateNonEmptyString', () => {
  it('accepts a non-empty string', () => {
    assert.doesNotThrow(() => validateNonEmptyString('hello'));
  });

  it('throws on empty string', () => {
    assert.throws(() => validateNonEmptyString(''), /cannot be empty/);
  });

  it('throws on whitespace-only string', () => {
    assert.throws(() => validateNonEmptyString('   '), /cannot be empty/);
  });
});

describe('validatePercentage', () => {
  it('accepts 0 and 100', () => {
    assert.doesNotThrow(() => validatePercentage(0));
    assert.doesNotThrow(() => validatePercentage(100));
  });

  it('accepts a mid value', () => {
    assert.doesNotThrow(() => validatePercentage(50));
  });

  it('throws below range', () => {
    assert.throws(() => validatePercentage(-0.01), /between 0 and 100/);
  });

  it('throws above range', () => {
    assert.throws(() => validatePercentage(100.01), /between 0 and 100/);
  });
});

describe('validateBasisPoints', () => {
  it('accepts 0 and 10000', () => {
    assert.doesNotThrow(() => validateBasisPoints(0));
    assert.doesNotThrow(() => validateBasisPoints(10000));
  });

  it('throws below range', () => {
    assert.throws(() => validateBasisPoints(-1), /between 0 and 10000/);
  });

  it('throws above range', () => {
    assert.throws(() => validateBasisPoints(10001), /between 0 and 10000/);
  });
});

describe('validateETHAmount', () => {
  it('accepts a positive ETH string', () => {
    assert.doesNotThrow(() => validateETHAmount('1.5'));
  });

  it('accepts zero', () => {
    assert.doesNotThrow(() => validateETHAmount('0'));
  });

  it('throws on a non-numeric string', () => {
    assert.throws(() => validateETHAmount('abc'), /Amount is invalid/);
  });

  it('uses the provided field name on failure', () => {
    assert.throws(
      () => validateETHAmount('abc', 'ReservePrice'),
      /ReservePrice is invalid/,
    );
  });
});

describe('validateNonEmptyArray', () => {
  it('accepts a non-empty array', () => {
    assert.doesNotThrow(() => validateNonEmptyArray([1]));
  });

  it('throws on empty array', () => {
    assert.throws(() => validateNonEmptyArray([]), /cannot be empty/);
  });
});

describe('validateChoice', () => {
  it('accepts a value in the allowed list', () => {
    assert.doesNotThrow(() => validateChoice('a', ['a', 'b', 'c']));
  });

  it('throws when the value is not in the allowed list', () => {
    assert.throws(
      () => validateChoice('z', ['a', 'b', 'c']),
      /must be one of: a, b, c\. Got: z/,
    );
  });

  it('uses the provided field name on failure', () => {
    assert.throws(
      () => validateChoice(99, [1, 2, 3], 'TokenStandard'),
      /TokenStandard must be one of/,
    );
  });
});
