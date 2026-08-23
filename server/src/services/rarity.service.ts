export type RarityTier = 'Legendary' | 'Epic' | 'Rare';

/**
 * TASK: assign a rarity tier to every track in a single case's song list.
 *
 * Rules (settled):
 * - Ranking happens ONLY within this list -- never compare against a
 *   user's whole pool. Sort the given tracks by `rank` ascending
 *   (lowest rank number = best).
 * - Exactly one Legendary: whichever track lands in position #1 after
 *   sorting.
 * - Epic count = Math.floor(caseTracks.length / 3).
 * - Everything else is Rare.
 *
 * Must work correctly for any case size in the 6-10 range.
 *
 * Steps:
 * 1. Make a SORTED COPY of caseTracks by rank ascending -- don't mutate
 *    the array you were given (Array.prototype.sort() mutates in place,
 *    so sort a copy: [...caseTracks].sort(...)).
 * 2. Compute epicCount = Math.floor(caseTracks.length / 3).
 * 3. Walk the sorted copy by index: position 0 gets 'Legendary',
 *    positions 1..epicCount get 'Epic', everything after gets 'Rare'.
 * 4. Return the sorted array with a `rarity` field attached to each track
 *    (e.g. via .map((track, index) => ({ ...track, rarity: ... }))).
 */
export function assignRarity<T extends { rank: number }>(
  caseTracks: T[]
): (T & { rarity: RarityTier })[] {
  throw new Error('not implemented');
}
