import Link from "next/link";

export const metadata = { title: "How to Play — Farm Vs Monsters" };

export default function HowToPlayPage() {
  return (
    <main className="info-shell">
      <article className="info-card">
        <p className="eyebrow">FIELD GUIDE</p>
        <h1>How to Play</h1>
        <p>Defend the farmhouse and princess through five increasingly difficult monster waves. The first campaign contains 100 monsters across five waves: 10, 15, 20, 25, and 30 monsters.</p>
        <h2>1. Plant a Radish</h2>
        <p>Select the Radish seed card, then choose an empty soil cell. The caveman runs to that cell, plants the defender, and returns to his original position. Planting costs 35 energy. You begin with 150 energy, and each defeated monster restores 8 energy. The Radish is the only plant available in this first phase.</p>
        <h2>2. Build your defense</h2>
        <p>Radishes stay rooted in their cells and automatically attack monsters approaching along the lanes. Place defenders where they can cover the path before monsters reach the house.</p>
        <h2>3. Protect the farmhouse</h2>
        <p>Monsters stop to eat plants blocking their lane. If they break through, they attack the farmhouse over time. The battle is lost only when farmhouse health reaches zero.</p>
        <h2>4. Emergency club combat</h2>
        <p>If every defensive plant is destroyed, the caveman can use his club. Planting a new defender successfully ends emergency combat immediately.</p>
        <h2>Controls</h2>
        <ul><li>W A S D or Arrow keys: move the caveman.</li><li>Space: use the club when emergency combat is active.</li><li>P: pause or open the pause menu.</li><li>Mouse: select the Radish card and plant in an empty cell.</li></ul>
        <nav className="info-nav"><Link className="primary-link" href="/game">Start Game</Link><Link className="secondary-link" href="/">Main Menu</Link></nav>
      </article>
    </main>
  );
}
