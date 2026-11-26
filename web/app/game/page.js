"use client";

import PhaserGame from "../../game/PhaserGame";

export default function GamePage() {
  return (
    <main className="game-shell game-shell-battle-only">
      <section className="game-panel" aria-label="Battle arena">
        <PhaserGame />
      </section>
    </main>
  );
}
