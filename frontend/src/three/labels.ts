import * as THREE from 'three';

export interface BuildingLabel {
  sprite: THREE.Sprite;
  baseY: number;
  baseScale: THREE.Vector2;
}

const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

function drawPill(text: string, subtitle: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  ctx.fillStyle = 'rgba(240, 235, 220, 0.97)';
  ctx.beginPath();
  const h = subtitle ? 160 : 108;
  const dy = subtitle ? 0 : 24;
  ctx.roundRect(16, 16 + dy, 608, h, 56);
  ctx.fill();
  ctx.strokeStyle = 'rgba(88, 78, 118, 0.98)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 场馆名称：更粗更大、加深加投影，清晰醒目
  ctx.fillStyle = '#1d1a2b';
  ctx.shadowColor = 'rgba(20, 15, 40, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = `800 66px ${FONT}`;
  ctx.fillText(text, 320, subtitle ? 76 : 68 + dy);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (subtitle) {
    // 简短介绍：加粗加深
    ctx.fillStyle = '#49445e';
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText(subtitle, 320, 132);
  }
  ctx.fillStyle = 'rgba(240, 235, 220, 0.97)';
  ctx.beginPath();
  const tail = 16 + dy + h - 2;
  ctx.moveTo(300, tail);
  ctx.lineTo(340, tail);
  ctx.lineTo(320, tail + 30);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

export function createLabel(text: string, anchor: THREE.Vector3, buildingId: string, subtitle = ''): BuildingLabel {
  const tex = new THREE.CanvasTexture(drawPill(text, subtitle));
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false });
  const sprite = new THREE.Sprite(mat);
  const scale = new THREE.Vector2(6.4, 2.4);
  sprite.scale.set(scale.x, scale.y, 1);
  sprite.position.copy(anchor);
  sprite.renderOrder = 20;
  sprite.userData.buildingId = buildingId;
  return { sprite, baseY: anchor.y, baseScale: scale };
}

export function updateLabels(labels: BuildingLabel[], time: number, hoveredId: string | null): void {
  labels.forEach((l, i) => {
    l.sprite.position.y = l.baseY + Math.sin(time * 1.6 + i * 1.3) * 0.18;
    const k = hoveredId === l.sprite.userData.buildingId ? 1.12 : 1;
    const cur = l.sprite.scale.x / l.baseScale.x;
    const next = cur + (k - cur) * 0.2;
    l.sprite.scale.set(l.baseScale.x * next, l.baseScale.y * next, 1);
  });
}

export function disposeLabels(labels: BuildingLabel[]): void {
  labels.forEach(l => {
    l.sprite.material.map?.dispose();
    l.sprite.material.dispose();
  });
}
