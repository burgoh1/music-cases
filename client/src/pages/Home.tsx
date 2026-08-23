import { useState } from 'react';
import { useAuth } from '../context/useAuth.js';

// Temporary manual-QA controls for Lesson 9 -- not real product UI.
export function Home() {
  const { logoutAll, authFetch } = useAuth();
  const [output, setOutput] = useState<string>('');

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
    setOutput(JSON.stringify(await res.json(), null, 2));
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
      <pre>{output}</pre>
    </div>
  );
}
