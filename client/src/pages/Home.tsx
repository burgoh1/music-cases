import { useAuth } from '../context/useAuth.js';

export function Home() {
  const { logout, logoutAll } = useAuth();

  return (
    <div>
      home
      <button onClick={() => logout()}>Log out</button>
      <button onClick={() => logoutAll()}>Log out everywhere</button>
    </div>
  );
}
