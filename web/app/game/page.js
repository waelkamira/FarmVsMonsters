"use client";

import PhaserGame from "../../game/PhaserGame";

export default function GamePage() {
  return (
    <main className="game-shell game-shell-arena-only">
      <section className="game-panel game-panel-arena-only" aria-label="Battle arena">
        <PhaserGame />
      </section>
    </main>
  );
}
