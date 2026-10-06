/**
 * Small effects that many games use: a glowing projectile on an arc and a ring of sparks. They
 * run on the stage timeline and remove themselves.
 */
import * as THREE from 'three';
import type { Stage3D } from './stage.js';

/** A glowing ball from `from` to `to` on an arc; resolves on arrival (then a burst plays). */
export function projectile(stage: Stage3D, from: THREE.Vector3, to: THREE.Vector3, color: THREE.ColorRepresentation, seconds = 0.42, arc = 0.6): Promise<void> {
  const ballMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), ballMat);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), glowMat);
  ball.add(glow);
  stage.scene.add(ball);
  return stage.timeline
    .tween(seconds, (u) => {
      ball.position.lerpVectors(from, to, u);
      ball.position.y += Math.sin(u * Math.PI) * arc;
      glow.scale.setScalar(1 + 0.25 * Math.sin(u * 20));
    })
    .then(() => {
      ball.removeFromParent();
      ball.geometry.dispose();
      glow.geometry.dispose();
      ballMat.dispose();
      glowMat.dispose();
      burst(stage, to, color);
    });
}

/** A quick ring of sparks at a point. */
export function burst(stage: Stage3D, at: THREE.Vector3, color: THREE.ColorRepresentation, count = 14, reach = 0.84): Promise<void> {
  const geo = new THREE.SphereGeometry(0.05, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  const sparks = Array.from({ length: count }, (_, i) => {
    const s = new THREE.Mesh(geo, mat);
    const a = (i / count) * Math.PI * 2;
    s.userData.dir = new THREE.Vector3(Math.cos(a), 0.6 + (i % 3) * 0.3, Math.sin(a));
    s.position.copy(at);
    stage.scene.add(s);
    return s;
  });
  return stage.timeline
    .tween(0.5, (u) => {
      for (const s of sparks) s.position.copy(at).addScaledVector(s.userData.dir as THREE.Vector3, u * reach);
      mat.opacity = 1 - u;
    })
    .then(() => {
      for (const s of sparks) s.removeFromParent();
      geo.dispose();
      mat.dispose();
    });
}
