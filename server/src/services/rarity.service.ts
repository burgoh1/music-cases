export type RarityTier = 'Legendary' | 'Epic' | 'Rare';

// assign a rarity tier to every track in a single case's song list
export function assignRarity<T extends { rank: number }>(
  caseTracks: T[]
): (T & { rarity: RarityTier })[] {
  // sorts tracks in accending order based on track rank
  const sortedTracks = [...caseTracks].sort(
    (trackA, trackB) => trackA.rank - trackB.rank
  );
  // decides how many epic tracks each case gets
  const epicCount = Math.floor(caseTracks.length / 3);

  // tags tracks with rarity values
  return sortedTracks.map((track, index) => ({
    ...track,
    rarity: index === 0 ? 'Legendary' : index <= epicCount ? 'Epic' : 'Rare',
  }));
}
