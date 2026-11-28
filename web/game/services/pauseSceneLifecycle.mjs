/**
 * Claims the one-shot transition out of the pause scene.
 *
 * Phaser queues scene operations until its scene manager processes them. A held
 * key or rapid pointer clicks can otherwise enqueue duplicate resume/restart
 * operations before the pause scene receives its shutdown event.
 */
export function claimPauseSceneTransition(scene) {
  if (!scene || scene.pauseTransitioning === true) return false;
  scene.pauseTransitioning = true;
  return true;
}
