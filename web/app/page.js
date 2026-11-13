import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <div className="home-card">
        <p className="eyebrow">2D HAND-DRAWN FARM DEFENSE</p>
        <h1>Farm <span>Vs</span> Monsters</h1>
        <p className="home-copy">
          Plant your defenders, protect the farmhouse, and keep the princess safe.
          When the last plant falls, the caveman must defend the farm with his club.
        </p>
        <Link className="primary-link" href="/game">Start the prototype</Link>
        <p className="home-note">A playable systems prototype. Original character art will replace the temporary shapes.</p>
      </div>
    </main>
  );
}
