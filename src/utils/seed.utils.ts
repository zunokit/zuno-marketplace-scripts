/**
 * Deterministic seed utilities for local-network testing.
 *
 * The CLI is used heavily against `anvil` / `foundry` forks, where we need
 * **stable, reproducible** test fixtures: a given seed string must always
 * produce the same set of addresses, token IDs, and collection metadata so
 * that the same test script can be re-run, diffed against last run, and
 * shared between machines.
 *
 * Everything in this module is pure and synchronous and has no third-party
 * dependencies beyond Node's built-in `crypto`. That matters because these
 * helpers may be called both from the CLI process and from the lightweight
 * test harness (`tests/test-sdk.ts`, `tests/test-real-data.ts`).
 */

import { createHash } from 'crypto';

/**
 * 32-bit non-cryptographic PRNG. Mulberry32; output is the same on Node,
 * the browser, and bun, which keeps fixtures stable across runtimes.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string seed to a stable 32-bit integer using sha256. Mulberry32
 * accepts a 32-bit int so we fold the digest down.
 */
function seedToInt(seed: string): number {
  const digest = createHash('sha256').update(seed).digest();
  return digest.readUInt32BE(0);
}

/**
 * EIP-55-style mixed-case hex address. **Do not** pass these to anything
 * that requires a checksum that can be verified against a key — these are
 * pseudo-random and exist only to give realistic-looking fixtures.
 */
export function deterministicAddress(seed: string): `0x${string}` {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 40);
  return (`0x${hex}` as `0x${string}`);
}

/**
 * Generate `count` distinct deterministic addresses from a seed.
 *
 * Subsequent calls with the same `(seed, count)` return the same array in
 * the same order.
 */
export function deterministicAddresses(
  seed: string,
  count: number,
): `0x${string}`[] {
  if (count < 0 || !Number.isInteger(count)) {
    throw new Error(`count must be a non-negative integer, got ${count}`);
  }
  const out: `0x${string}`[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(deterministicAddress(`${seed}:${i}`));
  }
  return out;
}

/**
 * Generate `count` token IDs by walking a Mulberry32 PRNG keyed off `seed`.
 * Returned as decimal strings so callers can feed them straight to
 * `ethers.parseUnits()` / contract args without precision loss.
 */
export function deterministicTokenIds(seed: string, count: number): string[] {
  if (count < 0 || !Number.isInteger(count)) {
    throw new Error(`count must be a non-negative integer, got ${count}`);
  }
  const rand = mulberry32(seedToInt(seed));
  const seen = new Set<string>();
  const out: string[] = [];
  while (out.length < count) {
    const next = Math.floor(rand() * 1_000_000).toString();
    if (!seen.has(next)) {
      seen.add(next);
      out.push(next);
    }
  }
  return out;
}

const ADJECTIVES = [
  'Cosmic',
  'Lunar',
  'Solar',
  'Quantum',
  'Mythic',
  'Prismatic',
  'Forgotten',
  'Eternal',
  'Crystal',
  'Stellar',
];

const NOUNS = [
  'Wanderer',
  'Guardian',
  'Specter',
  'Glyph',
  'Sigil',
  'Beast',
  'Voyager',
  'Hunter',
  'Echo',
  'Phantom',
];

const TRAIT_NAMES = ['Background', 'Body', 'Eyes', 'Outfit', 'Accessory'];
const TRAIT_VALUES = ['Rare', 'Common', 'Epic', 'Legendary', 'Mythic'];

export interface SeededTrait {
  trait_type: string;
  value: string;
}

export interface SeededNftMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: SeededTrait[];
}

export interface SeededCollection {
  name: string;
  symbol: string;
  description: string;
  owner: `0x${string}`;
  baseUri: string;
  /** Pre-mint token IDs the seed promises to create. */
  tokenIds: string[];
}

/**
 * Generate a deterministic ERC-721/1155 metadata object suitable for using
 * as a mint argument or for posting to a metadata API in tests.
 */
export function deterministicNftMetadata(
  seed: string,
  index: number,
): SeededNftMetadata {
  const rand = mulberry32(seedToInt(`${seed}:nft:${index}`));
  const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)] ?? 'Mystery';
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)] ?? 'Token';
  const id = Math.floor(rand() * 1_000_000)
    .toString()
    .padStart(6, '0');

  const attributes: SeededTrait[] = [];
  for (const traitName of TRAIT_NAMES) {
    const value = TRAIT_VALUES[Math.floor(rand() * TRAIT_VALUES.length)] ?? 'Common';
    attributes.push({ trait_type: traitName, value });
  }

  return {
    name: `${adjective} ${noun} #${id}`,
    description: `Auto-generated test asset (seed=${seed}, index=${index}).`,
    image: `ipfs://example/${id}.png`,
    external_url: `https://example.test/nft/${id}`,
    attributes,
  };
}

/**
 * Generate a full collection fixture: deterministic owner, name/symbol,
 * baseUri, and a pre-baked list of token IDs callers can mint in tests.
 */
export function deterministicCollection(
  seed: string,
  tokenCount: number,
): SeededCollection {
  if (tokenCount < 0 || !Number.isInteger(tokenCount)) {
    throw new Error(
      `tokenCount must be a non-negative integer, got ${tokenCount}`,
    );
  }
  const rand = mulberry32(seedToInt(`${seed}:collection`));
  const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)] ?? 'Mystery';
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)] ?? 'Set';

  const name = `${adjective} ${noun}`;
  const symbol = `${(adjective[0] ?? 'M').toUpperCase()}${(noun[0] ?? 'S').toUpperCase()}`;

  return {
    name,
    symbol,
    description: `Auto-generated test collection (seed=${seed}).`,
    owner: deterministicAddress(`${seed}:owner`),
    baseUri: `ipfs://example/${createHash('sha256').update(seed).digest('hex').slice(0, 16)}/`,
    tokenIds: deterministicTokenIds(`${seed}:tokens`, tokenCount),
  };
}
