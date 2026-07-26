import { useAuth } from '../context/useAuth.js';

export function Home() {
  const { logoutAll } = useAuth();

  return (
    <div>
      Protected home
      <button onClick={() => logoutAll()}>Log out everywhere</button>
    </div>
  );
}
