/**
 * Run with: pnpm test
 * (configured in package.json as `node --test --import tsx tests/unit/*.test.ts`)
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  deterministicAddress,
  deterministicAddresses,
  deterministicCollection,
  deterministicNftMetadata,
  deterministicTokenIds,
} from '../../src/utils/seed.utils';

describe('deterministicAddress', () => {
  it('returns a 0x-prefixed 42-char hex string', () => {
    const addr = deterministicAddress('alpha');
    assert.match(addr, /^0x[0-9a-f]{40}$/);
  });

  it('is stable across calls with the same seed', () => {
    assert.equal(deterministicAddress('seed-1'), deterministicAddress('seed-1'));
  });

  it('changes with a different seed', () => {
    assert.notEqual(
      deterministicAddress('seed-1'),
      deterministicAddress('seed-2'),
    );
  });
});

describe('deterministicAddresses', () => {
  it('returns the requested count', () => {
    const addrs = deterministicAddresses('alpha', 5);
    assert.equal(addrs.length, 5);
  });

  it('returns an empty array for count=0', () => {
    assert.deepEqual(deterministicAddresses('alpha', 0), []);
  });

  it('throws on non-integer count', () => {
    assert.throws(() => deterministicAddresses('a', 1.5));
  });

  it('throws on negative count', () => {
    assert.throws(() => deterministicAddresses('a', -1));
  });

  it('produces stable output for the same seed', () => {
    assert.deepEqual(
      deterministicAddresses('alpha', 3),
      deterministicAddresses('alpha', 3),
    );
  });

  it('produces unique addresses within a batch', () => {
    const addrs = deterministicAddresses('alpha', 25);
    assert.equal(new Set(addrs).size, 25);
  });
});

describe('deterministicTokenIds', () => {
  it('returns the requested count', () => {
    assert.equal(deterministicTokenIds('alpha', 10).length, 10);
  });

  it('returns decimal strings only', () => {
    const ids = deterministicTokenIds('alpha', 10);
    for (const id of ids) {
      assert.match(id, /^[0-9]+$/);
    }
  });

  it('produces stable output for the same seed', () => {
    assert.deepEqual(
      deterministicTokenIds('alpha', 5),
      deterministicTokenIds('alpha', 5),
    );
  });

  it('produces deduplicated ids within a single batch', () => {
    const ids = deterministicTokenIds('alpha', 50);
    assert.equal(new Set(ids).size, 50);
  });

  it('throws on non-integer count', () => {
    assert.throws(() => deterministicTokenIds('a', 1.5));
  });
});

describe('deterministicNftMetadata', () => {
  it('produces stable output for the same (seed, index)', () => {
    assert.deepEqual(
      deterministicNftMetadata('alpha', 0),
      deterministicNftMetadata('alpha', 0),
    );
  });

  it('produces different output for different indexes', () => {
    assert.notDeepEqual(
      deterministicNftMetadata('alpha', 0),
      deterministicNftMetadata('alpha', 1),
    );
  });

  it('always emits 5 attribute traits', () => {
    const meta = deterministicNftMetadata('alpha', 0);
    assert.equal(meta.attributes.length, 5);
  });

  it('uses ipfs:// for image and https:// for external_url', () => {
    const meta = deterministicNftMetadata('alpha', 0);
    assert.ok(meta.image.startsWith('ipfs://'));
    assert.ok(meta.external_url.startsWith('https://'));
  });
});

describe('deterministicCollection', () => {
  it('produces stable output for the same seed', () => {
    assert.deepEqual(
      deterministicCollection('alpha', 5),
      deterministicCollection('alpha', 5),
    );
  });

  it('emits the requested number of token ids', () => {
    assert.equal(deterministicCollection('alpha', 7).tokenIds.length, 7);
  });

  it('emits a valid 0x-prefixed owner address', () => {
    const coll = deterministicCollection('alpha', 3);
    assert.match(coll.owner, /^0x[0-9a-f]{40}$/);
  });

  it('emits a 2-character uppercase symbol', () => {
    const coll = deterministicCollection('alpha', 3);
    assert.match(coll.symbol, /^[A-Z]{2}$/);
  });

  it('emits an ipfs base URI', () => {
    const coll = deterministicCollection('alpha', 3);
    assert.match(coll.baseUri, /^ipfs:\/\/example\/[0-9a-f]{16}\/$/);
  });

  it('different seeds produce different owners', () => {
    assert.notEqual(
      deterministicCollection('alpha', 1).owner,
      deterministicCollection('beta', 1).owner,
    );
  });

  it('throws on negative tokenCount', () => {
    assert.throws(() => deterministicCollection('alpha', -1));
  });
});
