// IRONVOID - first person renderer. A textured raycaster writing into a
// low-resolution pixel buffer, upscaled with nearest-neighbour for the look.
(function (IV) {
  'use strict';

  const R = {};
  const BUF_W = 480, BUF_H = 270;
  const FOG = { r: 8, g: 10, b: 14 };
  const VIEW = 26;         // metres before full fog
  const LAMP = 7.5;        // headlamp reach

  let buf = null, px = null, img = null, off = null, offCtx = null;
  let zbuf = new Float32Array(BUF_W);

  R.init = function () {
    off = document.createElement('canvas');
    off.width = BUF_W; off.height = BUF_H;
    offCtx = off.getContext('2d');
    img = offCtx.createImageData(BUF_W, BUF_H);
    buf = img.data;
    px = new Uint32Array(buf.buffer);
    return R;
  };

  R.W = BUF_W; R.H = BUF_H;

  function texFor(cell) {
    const A = IV.ART;
    switch (cell) {
      case IV.CELL.STEEL: return A.steel;
      case IV.CELL.RUST: return A.rust;
      case IV.CELL.GLASS: return A.glass;
      case IV.CELL.DOOR: return A.door;
      case IV.CELL.LOCKED: return A.locked;
      default: return A.steel;
    }
  }

  // light: 0..1 -> fold pixel toward fog colour, in place.
  function litPixel(c, light) {
    const r = (c & 255), g = (c >> 8) & 255, b = (c >> 16) & 255;
    const nr = FOG.r + ((r - FOG.r) * light) | 0;
    const ng = FOG.g + ((g - FOG.g) * light) | 0;
    const nb = FOG.b + ((b - FOG.b) * light) | 0;
    return 0xff000000 | (nb << 16) | (ng << 8) | nr;
  }

  function lightAt(d, alarm) {
    // ambient falls off with distance; headlamp adds a near-field pool
    const amb = Math.max(0, 1 - d / VIEW) * (0.34 + alarm * 0.12);
    const lamp = Math.max(0, 1 - d / LAMP);
    return Math.min(1.15, amb + lamp * lamp * 0.95);
  }

  R.render = function (raid, cam) {
    const A = IV.ART;
    const p = raid.player;
    const dirX = Math.cos(p.ang), dirY = Math.sin(p.ang);
    const fov = cam && cam.fov ? cam.fov : 0.66;
    const planeX = -dirY * fov, planeY = dirX * fov;
    const horizon = (BUF_H / 2 + (cam ? cam.horizon : 0)) | 0;
    const alarm = raid.alarm;

    // ---- floor and ceiling ------------------------------------------
    const rayDirX0 = dirX - planeX, rayDirY0 = dirY - planeY;
    const rayDirX1 = dirX + planeX, rayDirY1 = dirY + planeY;
    const ft = A.floor, ct = A.ceil;
    for (let y = 0; y < BUF_H; y++) {
      const isFloor = y > horizon;
      const pdist = isFloor ? (0.5 * BUF_H) / (y - horizon) : (0.5 * BUF_H) / (horizon - y);
      if (!isFinite(pdist) || pdist > VIEW * 1.6) {
        const row = y * BUF_W;
        const c = 0xff000000 | (FOG.b << 16) | (FOG.g << 8) | FOG.r;
        for (let x = 0; x < BUF_W; x++) px[row + x] = c;
        continue;
      }
      const stepX = (pdist * (rayDirX1 - rayDirX0)) / BUF_W;
      const stepY = (pdist * (rayDirY1 - rayDirY0)) / BUF_W;
      let fx = p.x + pdist * rayDirX0;
      let fy = p.y + pdist * rayDirY0;
      const tex = isFloor ? ft : ct;
      const tw = tex.w, th = tex.h, tpx = tex.px;
      const light = lightAt(pdist, alarm) * (isFloor ? 1 : 0.72);
      const row = y * BUF_W;
      for (let x = 0; x < BUF_W; x++) {
        const tx = (((fx * tw) | 0) % tw + tw) % tw;
        const ty = (((fy * th) | 0) % th + th) % th;
        px[row + x] = litPixel(tpx[ty * tw + tx], light);
        fx += stepX; fy += stepY;
      }
    }

    // ---- walls -------------------------------------------------------
    for (let x = 0; x < BUF_W; x++) {
      const camX = (2 * x) / BUF_W - 1;
      const rdX = dirX + planeX * camX;
      const rdY = dirY + planeY * camX;
      let mapX = p.x | 0, mapY = p.y | 0;
      const dDistX = Math.abs(1 / (rdX || 1e-9));
      const dDistY = Math.abs(1 / (rdY || 1e-9));
      let stepX, stepY, sideDistX, sideDistY;
      if (rdX < 0) { stepX = -1; sideDistX = (p.x - mapX) * dDistX; }
      else { stepX = 1; sideDistX = (mapX + 1 - p.x) * dDistX; }
      if (rdY < 0) { stepY = -1; sideDistY = (p.y - mapY) * dDistY; }
      else { stepY = 1; sideDistY = (mapY + 1 - p.y) * dDistY; }

      let side = 0, hit = 0, cell = 0, guard = 0;
      while (!hit && guard++ < 256) {
        if (sideDistX < sideDistY) { sideDistX += dDistX; mapX += stepX; side = 0; }
        else { sideDistY += dDistY; mapY += stepY; side = 1; }
        cell = IV.cellAt(raid, mapX, mapY);
        if (cell === IV.CELL.DOOR || cell === IV.CELL.LOCKED) {
          const d = raid.doors.get(mapX + ',' + mapY);
          if (d && d.open >= 0.75) continue; // fully retracted: see straight through
          hit = 1;
        } else if (IV.isSolidCell(cell)) hit = 1;
      }
      const perp = side === 0
        ? (mapX - p.x + (1 - stepX) / 2) / (rdX || 1e-9)
        : (mapY - p.y + (1 - stepY) / 2) / (rdY || 1e-9);
      const dist = Math.max(0.06, perp);
      zbuf[x] = dist;
      if (!hit) continue;

      const lineH = (BUF_H / dist) | 0;
      let y0 = horizon - (lineH >> 1);
      let y1 = horizon + (lineH >> 1);
      const drawY0 = y0 < 0 ? 0 : y0;
      const drawY1 = y1 > BUF_H ? BUF_H : y1;

      const tex = texFor(cell);
      const tw = tex.w, th = tex.h, tpx = tex.px;
      let wallX = side === 0 ? p.y + dist * rdY : p.x + dist * rdX;
      wallX -= Math.floor(wallX);
      let texX = (wallX * tw) | 0;
      if ((side === 0 && rdX > 0) || (side === 1 && rdY < 0)) texX = tw - texX - 1;

      let light = lightAt(dist, alarm) * (side === 1 ? 0.74 : 1.0);
      const door = (cell === IV.CELL.DOOR || cell === IV.CELL.LOCKED) ? raid.doors.get(mapX + ',' + mapY) : null;
      if (door && door.open > 0) light = Math.min(1.4, light + door.open * 0.5);

      const stepTex = th / lineH;
      let texPos = (drawY0 - horizon + (lineH >> 1)) * stepTex;
      for (let y = drawY0; y < drawY1; y++) {
        const ty = (texPos | 0) & (th - 1);
        texPos += stepTex;
        px[y * BUF_W + x] = litPixel(tpx[ty * tw + texX], light);
      }
    }

    // ---- sprites ------------------------------------------------------
    const sprites = [];
    for (const e of raid.enemies) {
      const art = e.dead ? A.sprites.corpse : A.sprites[e.arch];
      sprites.push({ x: e.x, y: e.y, art: art, h: e.dead ? 0.3 : 0.88, tint: e.hurtT > 0 ? 1 : 0, dead: e.dead });
    }
    for (const c of raid.containers) {
      const art = c.searched ? A.sprites.opened : (c.tier === 'rare' ? A.sprites.crateRare : A.sprites.crate);
      sprites.push({ x: c.x, y: c.y, art: art, h: c.searched ? 0.35 : 0.62, tint: 0 });
    }
    for (const b of raid.bags) sprites.push({ x: b.x, y: b.y, art: A.sprites.bag, h: 0.4, tint: 0 });
    for (const z of raid.zones) {
      sprites.push({ x: z.x, y: z.y, art: z.kind === 'dock' ? A.sprites.extract : A.sprites.pod,
                     h: 1.0, tint: 0, glow: z.open ? 1 : 0 });
    }
    for (const s of sprites) s.d = (s.x - p.x) * (s.x - p.x) + (s.y - p.y) * (s.y - p.y);
    sprites.sort((a, b) => b.d - a.d);

    const invDet = 1 / (planeX * dirY - dirX * planeY);
    for (const s of sprites) {
      const relX = s.x - p.x, relY = s.y - p.y;
      const tX = invDet * (dirY * relX - dirX * relY);
      const tY = invDet * (-planeY * relX + planeX * relY);
      if (tY <= 0.12) continue;
      const screenX = ((BUF_W / 2) * (1 + tX / tY)) | 0;
      const full = BUF_H / tY;
      const yBottom = horizon + full / 2;
      const spriteH = s.h * full;
      const yTop = yBottom - spriteH;
      const spriteW = spriteH * (s.art.w / s.art.h);
      let x0 = Math.ceil(screenX - spriteW / 2);
      let x1 = Math.ceil(screenX + spriteW / 2);
      if (x1 < 0 || x0 >= BUF_W) continue;
      const light = Math.min(1.3, lightAt(tY, alarm) + (s.glow ? 0.5 : 0));
      const art = s.art, aw = art.w, ah = art.h, apx = art.px;
      const cx0 = x0 < 0 ? 0 : x0, cx1 = x1 > BUF_W ? BUF_W : x1;
      const iy0 = Math.max(0, yTop | 0), iy1 = Math.min(BUF_H, yBottom | 0);
      for (let x = cx0; x < cx1; x++) {
        if (tY >= zbuf[x]) continue;
        const u = (((x - x0) * aw) / spriteW) | 0;
        if (u < 0 || u >= aw) continue;
        for (let y = iy0; y < iy1; y++) {
          const v = (((y - yTop) * ah) / spriteH) | 0;
          if (v < 0 || v >= ah) continue;
          const c = apx[v * aw + u];
          if ((c & 0xff000000) >>> 24 < 128) continue;
          let out = litPixel(c, light);
          if (s.tint) {
            // flash red on a fresh hit
            const rr = Math.min(255, (out & 255) + 90);
            out = (out & 0xffffff00) | rr;
          }
          px[y * BUF_W + x] = out;
        }
      }
    }

    offCtx.putImageData(img, 0, 0);
    return off;
  };

  R.zbufAt = (x) => zbuf[IV.clamp(x | 0, 0, BUF_W - 1)];
  IV.Renderer = R;
})(window.IV);
