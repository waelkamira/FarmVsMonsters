import PhaserGame from "../../game/PhaserGame";

export const metadata = {
  title: "Battle — Farm Vs Monsters"
};

export default function GamePage() {
  return (
    <main className="game-shell">
      <header className="game-header">
        <a href="/" className="wordmark">Farm <span>Vs</span> Monsters</a>
        <div className="control-hint">Click RADISH, then click soil: the caveman walks there and plants it · WASD / arrows: move · Space: club only in emergency</div>
      </header>
      <section className="game-panel">
        <PhaserGame />
      </section>
      <p className="prototype-note">
        Temporary vector placeholders are used for gameplay validation. Your original hand-drawn sprites and animation sheets will be integrated as the assets are approved.
      </p>
    </main>
  );
}
