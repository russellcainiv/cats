// Root page: redirect to the game.
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/game');
}
