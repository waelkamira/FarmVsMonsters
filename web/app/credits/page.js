import Link from "next/link";

export const metadata = { title: "Credits — Farm Vs Monsters" };

export default function CreditsPage() {
  return (
    <main className="info-shell">
      <article className="info-card">
        <p className="eyebrow">THE PEOPLE AND TOOLS BEHIND THE FARM</p>
        <h1>Credits</h1>
        <p>Farm Vs Monsters is an independent game project built around a hand-drawn prehistoric farm-defense adventure.</p>
        <h2>Game project</h2>
        <p><strong>Title:</strong> Farm Vs Monsters</p>
        <p><strong>Design and development:</strong> Farm Vs Monsters project</p>
        <h2>Technology</h2>
        <ul>
          <li>Phaser 3 — 2D game framework</li>
          <li>Next.js and React — web application and menus</li>
        </ul>
        <h2>Art, sound, and contributors</h2>
        <p>Visual assets, animation, sound, and additional contributor credits will be listed here as the final production assets and contributors are approved.</p>
        <nav className="info-nav">
          <Link className="primary-link" href="/game">Play Game</Link>
          <Link className="secondary-link" href="/">Main Menu</Link>
        </nav>
      </article>
    </main>
  );
}
