import { useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import { Card, type CardData } from '../components/Card.js';

interface PoolSummary {
  totalCards: number;
  byGenreCase: Record<string, { count: number; cards: CardData[] }>;
}

// Temporary manual-QA controls for Lesson 9 -- not real product UI.
export function Home() {
  const { logoutAll, authFetch } = useAuth();
  const [output, setOutput] = useState<string>('');
  const [pool, setPool] = useState<PoolSummary | null>(null);

  async function connectSpotify() {
    const res = await authFetch('/api/spotify/connect');
    const data = await res.json();
    if (res.ok) {
      // leaves the app -- Spotify's consent screen, then the backend's
      // /callback route, isn't part of the React app
      window.location.href = data.url;
    } else {
      setOutput(JSON.stringify(data, null, 2));
    }
  }

  async function generatePool() {
    const res = await authFetch('/api/cards/generate-pool', {
      method: 'POST',
    });
    setOutput(JSON.stringify(await res.json(), null, 2));
  }

  async function viewMyPool() {
    const res = await authFetch('/api/cards/my-pool');
    const data = await res.json();
    setOutput(JSON.stringify(data, null, 2));
    setPool(res.ok ? data : null);
  }

  return (
    <div>
      Protected home
      <button onClick={() => logoutAll()}>Logout</button>
      <div>
        <button onClick={connectSpotify}>Connect Spotify</button>
        <button onClick={generatePool}>Generate Pool</button>
        <button onClick={viewMyPool}>View My Pool</button>
      </div>

      {pool && (
        <div className="mt-6 flex flex-col gap-8">
          {Object.entries(pool.byGenreCase).map(([genre, genreCase]) => (
            <div key={genre}>
              <h2 className="mb-3 text-lg font-bold capitalize text-ink-50">
                {genre} case ({genreCase.count})
              </h2>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                {genreCase.cards.map((card) => (
                  <Card key={card.spotifyTrackId} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <pre>{output}</pre>
    </div>
  );
}
