import {Scene} from '@babylonjs/core/scene';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {Color3} from '@babylonjs/core/Maths/math.color';

/** Small deterministic textures, generated once; no per-frame noise or downloads. */
export function agedMaterial(scene: Scene, name: string, base: string, kind: 'plaster' | 'metal' | 'wood' | 'tile' | 'cloth') {
  const mat = new StandardMaterial(name, scene);
  const texture = new DynamicTexture(`${name} surface`, 512, scene, true);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  let seed = 47;
  const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const bright = random() > .55;
    ctx.fillStyle = bright ? `rgba(220,215,193,${random() * .12})` : `rgba(13,20,15,${random() * .16})`;
    const x = random() * 512, y = random() * 512;
    ctx.fillRect(x, y, kind === 'wood' ? random() * 110 : 1 + random() * 5, kind === 'cloth' ? 1 : 1 + random() * 3);
  }
  for (let i = 0; i < 35; i++) {
    const x = random() * 512, y = random() * 512, r = 8 + random() * 70;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, kind === 'metal' ? '#63351f55' : '#17201835'); gradient.addColorStop(1, '#141a1400');
    ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (kind === 'plaster') {
    ctx.lineWidth = .6; ctx.strokeStyle = '#252b2055';
    for (let i = 0; i < 12; i++) {let x = random() * 512, y = random() * 512; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 8; j++) {x += random() * 18 - 9; y += random() * 18; ctx.lineTo(x, y);} ctx.stroke();}
  }
  if (kind === 'tile') {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#18272144' : '#a7a68b22'; ctx.fillRect(x * 128, y * 128, 128, 128);
      ctx.strokeStyle = '#18211a'; ctx.lineWidth = 3; ctx.strokeRect(x * 128, y * 128, 128, 128);
    }
  }
  texture.update(); mat.diffuseTexture = texture; mat.diffuseColor = Color3.White(); mat.specularColor = kind === 'metal' ? new Color3(.22, .22, .18) : new Color3(.03, .03, .025); mat.specularPower = 36;
  return mat;
}
