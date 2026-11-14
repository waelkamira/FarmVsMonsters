import PhaserGame from "../../game/PhaserGame";

export const metadata = {
  title: "Battle — Farm Vs Monsters"
};

export default function GamePage() {
  return (
    <main className="game-shell">
      <header className="game-header">
        <a href="/" className="wordmark">Farm <span>Vs</span> Monsters</a>
        <div className="control-hint">Choose Radish or Mushroom · Click a soil plot to plant · Collect glowing Mushroom energy · WASD / arrows to move · SPACE: emergency club</div>
      </header>
      <section className="game-panel" aria-label="Stone age battle arena">
        <PhaserGame />
      </section>
      <p className="prototype-note">
        A prehistoric farm-defense battle. Gather mushroom energy, raise living defenders, and keep the tribe's home safe.
      </p>
    </main>
  );
}
