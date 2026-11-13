import PhaserGame from "../../game/PhaserGame";

export const metadata = {
  title: "Battle — Farm Vs Monsters"
};

export default function GamePage() {
  return (
    <main className="game-shell">
      <header className="game-header">
        <a href="/" className="wordmark">Farm <span>Vs</span> Monsters</a>
        <div className="control-hint">1–3: choose plant · Click: plant · WASD / arrows: move · Space: club (only after all plants fall)</div>
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
