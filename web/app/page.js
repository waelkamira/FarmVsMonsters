import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <div className="home-card">
        <p className="eyebrow">A PRIMITIVE 2D FARM DEFENSE ADVENTURE</p>
        <h1>Farm <span>Vs</span> Monsters</h1>
        <p className="home-copy">
          The tribe's garden is the last wall between the monsters and the cave home.
          Plant brave Radish defenders, earn energy by defeating monsters, and protect the princess.
          When the final radish falls, the caveman takes up his wooden club.
        </p>
        <nav className="menu-actions" aria-label="Main menu">
          <Link className="primary-link" href="/game">New Game</Link>
          <Link className="secondary-link" href="/how-to-play">How to Play</Link>
          <Link className="secondary-link" href="/settings">Settings</Link>
          <Link className="secondary-link" href="/credits">Credits</Link>
        </nav>
        <div className="menu-facts"><span>5 WAVES</span><span>100 MONSTERS</span><span>1 FARM TO DEFEND</span></div>
        <p className="home-note">A hand-drawn prehistoric world of roots, stone, timber, and wild creatures.</p>
      </div>
    </main>
  );
}
