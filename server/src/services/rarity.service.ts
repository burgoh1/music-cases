export type RarityTier = 'Legendary' | 'Epic' | 'Rare';

// Assigns a rarity tier to every track in a single case's song list.
// Ranks only within this list -- position 0 after sorting by rank
// ascending is always Legendary, the next floor(caseSize / 3) tracks
// are Epic, everything else is Rare.
export function assignRarity<T extends { rank: number }>(
  caseTracks: T[]
): (T & { rarity: RarityTier })[] {
  const sortedTracks = [...caseTracks].sort(
    (trackA, trackB) => trackA.rank - trackB.rank
  );
  const epicCount = Math.floor(caseTracks.length / 3);

  return sortedTracks.map((track, index) => ({
    ...track,
    rarity: index === 0 ? 'Legendary' : index <= epicCount ? 'Epic' : 'Rare',
  }));
}
