export interface CardData {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  rarity: 'Legendary' | 'Epic' | 'Rare';
  artistImageUrl: string | null;
}

interface CardProps {
  card: CardData;
}

const RARITY_FRAME_SRC: Record<CardData['rarity'], string | null> = {
  Legendary: '/legendary-card-frame.png',
  Epic: '/epic-card-frame.png',
  Rare: '/rare-card-frame.png',
};

export function Card({ card }: CardProps) {
  const frameSrc = RARITY_FRAME_SRC[card.rarity];

  return (
    <div className="relative aspect-[5/7] w-full overflow-hidden rounded-xl border border-ink-600 bg-ink-800">
      {card.artistImageUrl ? (
        <img
          src={card.artistImageUrl}
          alt={card.artistName}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900 text-sm text-ink-500">
          No image
        </div>
      )}

      {frameSrc && (
        <img
          src={frameSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
        <p className="truncate text-sm font-bold text-ink-50">
          {card.trackName}
        </p>
        <p className="truncate text-xs text-ink-200">{card.artistName}</p>
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-brand-400">
          {card.rarity}
        </p>
      </div>
    </div>
  );
}
