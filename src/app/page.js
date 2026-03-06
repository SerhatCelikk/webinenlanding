"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";

export default function Home() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const btnRef = useRef(null);
  const [btnStyle, setBtnStyle] = useState({});
  const [shimmer, setShimmer] = useState({ x: 50, y: 50, opacity: 0 });
  const [spotStyle, setSpotStyle] = useState({ x: -9999, y: -9999 });

  /* ── Mouse tracking ── */
  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
    setSpotStyle({ x: e.clientX, y: e.clientY });

    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    const radius = 220;
    if (dist < radius) {
      const s = 1 - dist / radius;
      setBtnStyle({
        transform: `perspective(600px) rotateX(${(-dy / rect.height) * 22 * s}deg) rotateY(${(dx / rect.width) * 22 * s}deg) translate(${(dx / rect.width) * 12 * s}px,${(dy / rect.height) * 12 * s}px) scale(1.06)`,
        transition: "transform 0.1s ease",
      });
      setShimmer({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, opacity: 0.55 * s });
    } else {
      setBtnStyle({ transform: "perspective(600px) rotateX(0deg) rotateY(0deg) translate(0,0) scale(1)", transition: "transform 0.5s cubic-bezier(.22,1,.36,1)" });
      setShimmer((s) => ({ ...s, opacity: 0 }));
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setBtnStyle({ transform: "perspective(600px) rotateX(0deg) rotateY(0deg) translate(0,0) scale(1)", transition: "transform 0.6s cubic-bezier(.22,1,.36,1)" });
    setShimmer((s) => ({ ...s, opacity: 0 }));
  }, []);

  /* ── Canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // ── 3D Projection ──
    const FOV = 440;
    const project3d = (pt, cx, cy, rx, ry) => {
      // Rotate Y
      const x1 = pt.x * Math.cos(ry) + pt.z * Math.sin(ry);
      const z1 = -pt.x * Math.sin(ry) + pt.z * Math.cos(ry);
      // Rotate X
      const y1 = pt.y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = pt.y * Math.sin(rx) + z1 * Math.cos(rx);
      const sc = FOV / (FOV + z2 + 320);
      return { sx: cx + x1 * sc, sy: cy + y1 * sc, z: z2, sc };
    };

    // ── 3D Shape builders ──
    const build3d = (type, n) => {
      const base = Math.min(canvas.width, canvas.height);
      const r = base * (0.09 + Math.random() * 0.055);

      const fromEdges = (verts, edgePairs) => {
        const pts = [];
        const ppe = Math.ceil(n / edgePairs.length);
        for (const [a, b] of edgePairs) {
          const va = verts[a], vb = verts[b];
          for (let i = 0; i < ppe && pts.length < n; i++) {
            const t = i / ppe;
            pts.push({ x: va.x+(vb.x-va.x)*t, y: va.y+(vb.y-va.y)*t, z: va.z+(vb.z-va.z)*t });
          }
        }
        return pts;
      };

      if (type === "cube") {
        const v = [
          {x:-r,y:-r,z:-r},{x:r,y:-r,z:-r},{x:r,y:r,z:-r},{x:-r,y:r,z:-r},
          {x:-r,y:-r,z: r},{x:r,y:-r,z: r},{x:r,y:r,z: r},{x:-r,y:r,z: r},
        ];
        const e = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        return { pts: fromEdges(v, e), wireVerts: v, wireEdges: e };
      }
      if (type === "sphere") {
        const phi = Math.PI * (3 - Math.sqrt(5));
        const pts = Array.from({ length: n }, (_, i) => {
          const y = 1 - (i / (n - 1)) * 2;
          const rad = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = phi * i;
          return { x: Math.cos(theta)*rad*r, y: y*r, z: Math.sin(theta)*rad*r };
        });
        return { pts, wireVerts: null, wireEdges: [] };
      }
      if (type === "pyramid") {
        const h = r * 1.5, br = r * 0.9;
        const v = [
          {x:-br,y: h*0.35,z:-br},{x:br,y: h*0.35,z:-br},
          {x: br,y: h*0.35,z: br},{x:-br,y: h*0.35,z: br},
          {x:  0,y:-h*0.65,z:  0},
        ];
        const e = [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]];
        return { pts: fromEdges(v, e), wireVerts: v, wireEdges: e };
      }
      if (type === "octahedron") {
        const v = [
          {x:r,y:0,z:0},{x:-r,y:0,z:0},
          {x:0,y:r,z:0},{x:0,y:-r,z:0},
          {x:0,y:0,z:r},{x:0,y:0,z:-r},
        ];
        const e = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];
        return { pts: fromEdges(v, e), wireVerts: v, wireEdges: e };
      }
      if (type === "torus") {
        const R = r * 0.7, tr = r * 0.3;
        const pts = Array.from({ length: n }, (_, i) => {
          const u = (i / n) * Math.PI * 2;
          const v2 = ((i * 8) / n) * Math.PI * 2;
          return { x: (R+tr*Math.cos(v2))*Math.cos(u), y: tr*Math.sin(v2), z: (R+tr*Math.cos(v2))*Math.sin(u) };
        });
        return { pts, wireVerts: null, wireEdges: [] };
      }
      if (type === "icosahedron") {
        const tau = (1 + Math.sqrt(5)) / 2;
        const s = r / Math.sqrt(1 + tau * tau);
        const v = [
          {x:-s,y:tau*s,z:0},{x:s,y:tau*s,z:0},{x:-s,y:-tau*s,z:0},{x:s,y:-tau*s,z:0},
          {x:0,y:-s,z:tau*s},{x:0,y:s,z:tau*s},{x:0,y:-s,z:-tau*s},{x:0,y:s,z:-tau*s},
          {x:tau*s,y:0,z:-s},{x:tau*s,y:0,z:s},{x:-tau*s,y:0,z:-s},{x:-tau*s,y:0,z:s},
        ];
        const e = [
          [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
          [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
          [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],[7,8],[7,10],[8,9],[10,11],
        ];
        return { pts: fromEdges(v, e), wireVerts: v, wireEdges: e };
      }
      if (type === "diamond") {
        const v = [
          {x:0,y:-r*1.45,z:0},
          {x:r,y:-r*0.15,z:0},{x:0,y:-r*0.15,z:r},{x:-r,y:-r*0.15,z:0},{x:0,y:-r*0.15,z:-r},
          {x:r*0.55,y:r*0.55,z:0},{x:0,y:r*0.55,z:r*0.55},{x:-r*0.55,y:r*0.55,z:0},{x:0,y:r*0.55,z:-r*0.55},
          {x:0,y:r*1.15,z:0},
        ];
        const e = [
          [0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4],[4,1],
          [1,5],[2,6],[3,7],[4,8],[5,6],[6,7],[7,8],[8,5],[5,9],[6,9],[7,9],[8,9],
        ];
        return { pts: fromEdges(v, e), wireVerts: v, wireEdges: e };
      }
      return { pts: [], wireVerts: null, wireEdges: [] };
    };

    // ── Particles ──
    const TOTAL = 4500;
    const SHAPE_N = 200;  // per shape (3 shapes × 200 = 600 of 4500)
    const MAX_SHAPES = 10;
    const SHAPE_TYPES = ["cube","sphere","pyramid","octahedron","torus","icosahedron","diamond"];

    const particles = Array.from({ length: TOTAL }, (_, idx) => ({
      id: idx,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      dx: (Math.random() - 0.5) * 0.28,
      dy: (Math.random() - 0.5) * 0.28,
      vx: 0, vy: 0,
      opacity: Math.random() * 0.45 + 0.1,
      shapeId: null,  // which shape owns this particle
      pt3d: null,
    }));

    // ── Multi-shape state ──
    const DUR_GATHER   = 160;
    const DUR_HOLD     = 150;
    const DUR_DISSOLVE = 90;
    const SPAWN_EVERY  = 30;   // frames between spawn attempts

    let activeShapes = [];  // array of shape objects
    let spawnTimer = 0;
    let nextShapeId = 0;

    const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);

    const spawnShape = () => {
      const freeParts = particles.filter((p) => p.shapeId === null);
      if (freeParts.length < SHAPE_N) return;

      const m = 0.13;
      // Pick the candidate that is farthest from all existing shapes (ensures spread)
      let cx = 0, cy = 0, bestDist = -1;
      for (let attempt = 0; attempt < 30; attempt++) {
        const tx = canvas.width  * (m + Math.random() * (1 - 2 * m));
        const ty = canvas.height * (m + Math.random() * (1 - 2 * m));
        const minD = activeShapes.length === 0
          ? Infinity
          : Math.min(...activeShapes.map((s) => Math.hypot(tx - s.cx, ty - s.cy)));
        if (minD > bestDist) { bestDist = minD; cx = tx; cy = ty; }
      }

      const type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
      const { pts, wireVerts, wireEdges } = build3d(type, SHAPE_N);
      const shapeR = Math.min(canvas.width, canvas.height) * 0.14;
      const id = nextShapeId++;

      // Recruit free particles
      const chosen = freeParts.sort(() => Math.random()-0.5).slice(0, SHAPE_N);
      chosen.forEach((p, j) => {
        p.shapeId = id;
        p.pt3d = pts[j] ?? pts[pts.length - 1];
      });

      activeShapes.push({
        id, type, cx, cy,
        rotX: Math.random()*Math.PI*2,
        rotY: Math.random()*Math.PI*2,
        rotSpeedX: (0.006+Math.random()*0.007)*(Math.random()<0.5?1:-1),
        rotSpeedY: (0.008+Math.random()*0.008)*(Math.random()<0.5?1:-1),
        shapeR, wireVerts, wireEdges,
        phase: "gather",
        phaseTimer: 0,
        alpha: 0,
      });
    };

    const releaseShape = (s, explode = false) => {
      particles.forEach((p) => {
        if (p.shapeId !== s.id) return;
        if (explode) {
          const ang = Math.atan2(p.y - s.cy, p.x - s.cx);
          p.vx = Math.cos(ang) * (2.5 + Math.random() * 2.5);
          p.vy = Math.sin(ang) * (2.5 + Math.random() * 2.5);
        } else {
          const ang = Math.atan2(p.y - s.cy, p.x - s.cx);
          p.vx = Math.cos(ang) * (0.6 + Math.random() * 0.8);
          p.vy = Math.sin(ang) * (0.6 + Math.random() * 0.8);
        }
        p.shapeId = null; p.pt3d = null;
      });
    };

    // ── Ambient elements ──
    const blobs = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      phase: i * 1.57, speed: 0.003 + Math.random() * 0.003,
      rx: 190 + Math.random() * 130, ry: 130 + Math.random() * 100,
    }));
    const rings = Array.from({ length: 3 }, (_, i) => ({
      x: canvas.width*(0.2+i*0.3), y: canvas.height*(0.3+(i%2)*0.4),
      r: 60+i*40, phase: i*2.1, speed: 0.004+i*0.002,
    }));

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      t++; spawnTimer++;

      // ── Spawn new shapes ──
      if (spawnTimer >= SPAWN_EVERY && activeShapes.length < MAX_SHAPES) {
        spawnShape();
        spawnTimer = 0;
      }

      // ── Update each shape ──
      const toRemove = [];
      for (const s of activeShapes) {
        s.rotX += s.rotSpeedX;
        s.rotY += s.rotSpeedY;
        s.phaseTimer++;

        // Mouse break
        if (s.phase === "gather" || s.phase === "hold") {
          const proj = project3d({x:0,y:0,z:0}, s.cx, s.cy, s.rotX, s.rotY);
          if (mx > 0 && Math.hypot(mx-proj.sx, my-proj.sy) < s.shapeR) {
            releaseShape(s, true);
            s.phase = "dissolve"; s.phaseTimer = 0;
          }
        }

        // Phase transitions
        if (s.phase === "gather" && s.phaseTimer >= DUR_GATHER) {
          s.phase = "hold"; s.phaseTimer = 0;
        } else if (s.phase === "hold" && s.phaseTimer >= DUR_HOLD) {
          releaseShape(s, false);
          s.phase = "dissolve"; s.phaseTimer = 0;
        } else if (s.phase === "dissolve" && s.phaseTimer >= DUR_DISSOLVE) {
          toRemove.push(s.id);
        }

        // Alpha
        if (s.phase === "gather") s.alpha = easeOut3(s.phaseTimer / DUR_GATHER) * 0.22;
        else if (s.phase === "hold") s.alpha = 0.22 + Math.sin(s.phaseTimer * 0.08) * 0.06;
        else if (s.phase === "dissolve") s.alpha = (1 - easeOut3(s.phaseTimer / DUR_DISSOLVE)) * 0.22;
      }
      activeShapes = activeShapes.filter((s) => !toRemove.includes(s.id));

      // ── Aurora blobs ──
      blobs.forEach((b) => {
        b.phase += b.speed;
        const bx = b.x+Math.sin(b.phase*0.7)*110, by = b.y+Math.cos(b.phase*0.5)*75;
        const g = ctx.createRadialGradient(bx,by,0,bx,by,Math.max(b.rx,b.ry));
        g.addColorStop(0,"rgba(5,98,129,0.07)"); g.addColorStop(0.5,"rgba(5,98,129,0.025)"); g.addColorStop(1,"rgba(5,98,129,0)");
        ctx.save(); ctx.scale(1,b.ry/b.rx);
        ctx.beginPath(); ctx.arc(bx,by*(b.rx/b.ry),b.rx,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill(); ctx.restore();
      });

      // ── Floating rings ──
      rings.forEach((ring) => {
        ring.phase += ring.speed;
        const rx = ring.x+Math.sin(ring.phase)*28, ry = ring.y+Math.cos(ring.phase*0.7)*18;
        const pulse = Math.sin(ring.phase*2)*0.5+0.5;
        ctx.beginPath(); ctx.arc(rx,ry,ring.r+pulse*8,0,Math.PI*2);
        ctx.strokeStyle=`rgba(5,98,129,${0.05+pulse*0.04})`; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(rx,ry,ring.r*0.55+pulse*4,0,Math.PI*2);
        ctx.strokeStyle=`rgba(5,98,129,${0.03+pulse*0.02})`; ctx.lineWidth=0.5; ctx.stroke();
      });

      // ── 3D Wireframes ──
      for (const s of activeShapes) {
        if (s.alpha <= 0 || s.wireEdges.length === 0) continue;
        const projVerts = s.wireVerts
          ? s.wireVerts.map((v) => project3d(v, s.cx, s.cy, s.rotX, s.rotY))
          : [];
        const edges = s.wireEdges.map(([a, b]) => {
          const pa = projVerts[a], pb = projVerts[b];
          return { pa, pb, avgZ: (pa.z+pb.z)/2 };
        }).sort((a, b) => a.avgZ - b.avgZ);

        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = -(t * 0.6);
        for (const { pa, pb, avgZ } of edges) {
          const df = Math.max(0.2, 1 - (avgZ+300)/600);
          ctx.beginPath(); ctx.moveTo(pa.sx,pa.sy); ctx.lineTo(pb.sx,pb.sy);
          ctx.strokeStyle = `rgba(10,160,200,${s.alpha*df})`;
          ctx.lineWidth = 0.8; ctx.stroke();
        }
        ctx.setLineDash([]); ctx.restore();
      }

      // ── Per-shape center glow (cheap single gradient instead of per-particle) ──
      for (const s of activeShapes) {
        if (s.phase !== "hold") continue;
        const proj = project3d({x:0,y:0,z:0}, s.cx, s.cy, s.rotX, s.rotY);
        const glowR = Math.min(canvas.width, canvas.height) * 0.18;
        const g = ctx.createRadialGradient(proj.sx,proj.sy,0,proj.sx,proj.sy,glowR);
        g.addColorStop(0,"rgba(10,180,220,0.07)");
        g.addColorStop(1,"rgba(10,180,220,0)");
        ctx.beginPath(); ctx.arc(proj.sx,proj.sy,glowR,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill();
      }

      // ── Mouse ripple ──
      if (mx > 0) {
        for (let i = 0; i < 3; i++) {
          const rr = 36+i*30+Math.sin(t*0.05+i)*7;
          ctx.beginPath(); ctx.arc(mx,my,rr,0,Math.PI*2);
          ctx.strokeStyle=`rgba(5,98,129,${(0.05-i*0.012)*(0.5+Math.sin(t*0.05+i)*0.5)})`;
          ctx.lineWidth=1; ctx.stroke();
        }
      }

      // ── Update & draw particles ──
      particles.forEach((p) => {
        const ownerShape = p.shapeId !== null ? activeShapes.find((s) => s.id === p.shapeId) : null;

        if (ownerShape && p.pt3d) {
          const proj = project3d(p.pt3d, ownerShape.cx, ownerShape.cy, ownerShape.rotX, ownerShape.rotY);
          const k = ownerShape.phase === "hold" ? 0.11 : 0.036;
          const damp = ownerShape.phase === "hold" ? 0.80 : 0.86;
          p.vx = (p.vx+(proj.sx-p.x)*k)*damp;
          p.vy = (p.vy+(proj.sy-p.y)*k)*damp;
        } else {
          // Free float + mouse repulsion
          const pdx = p.x-mx, pdy = p.y-my;
          const pd = Math.hypot(pdx,pdy);
          if (pd < 90 && mx > 0) { const f=(90-pd)/90; p.vx+=(pdx/pd)*f*0.8; p.vy+=(pdy/pd)*f*0.8; }
          p.vx *= 0.92; p.vy *= 0.92;
          p.vx += p.dx*0.3; p.vy += p.dy*0.3;
          if (p.x < 0 || p.x > canvas.width)  { p.dx*=-1; p.vx*=-0.5; }
          if (p.y < 0 || p.y > canvas.height) { p.dy*=-1; p.vy*=-0.5; }
        }
        p.x += p.vx; p.y += p.vy;

        // Visuals
        let pr = p.r, pc;
        if (ownerShape && p.pt3d && ownerShape.phase === "hold") {
          const proj = project3d(p.pt3d, ownerShape.cx, ownerShape.cy, ownerShape.rotX, ownerShape.rotY);
          const depthScale = Math.max(0.5, proj.sc*2.2);
          const df = Math.max(0.3, 1-(proj.z+300)/600);
          pr = p.r*1.6*depthScale;
          pc = `rgba(10,${Math.floor(160+df*60)},220,${p.opacity*1.8*df})`;
        } else if (!ownerShape && mx > 0 && Math.hypot(p.x-mx,p.y-my) < 75) {
          pr = p.r*2.2; pc = `rgba(10,160,200,${p.opacity*2})`;
        } else {
          pc = `rgba(5,98,129,${p.opacity})`;
        }
        ctx.beginPath(); ctx.arc(p.x,p.y,pr,0,Math.PI*2);
        ctx.fillStyle=pc; ctx.fill();
      });

      // ── Connecting lines (sampled — step=10 keeps pairs ~100k at 4500 particles) ──
      for (let i = 0; i < particles.length; i += 10) {
        for (let j = i+10; j < particles.length; j += 10) {
          const pi = particles[i], pj = particles[j];
          const sameHeld = pi.shapeId !== null && pi.shapeId === pj.shapeId
            && activeShapes.find((s) => s.id === pi.shapeId)?.phase === "hold";
          const thr = sameHeld ? 52 : 65;
          const ddx = pi.x-pj.x, ddy = pi.y-pj.y;
          if (Math.abs(ddx)>thr || Math.abs(ddy)>thr) continue;
          const d = Math.sqrt(ddx*ddx+ddy*ddy);
          if (d < thr) {
            ctx.beginPath(); ctx.moveTo(pi.x,pi.y); ctx.lineTo(pj.x,pj.y);
            const a = sameHeld ? 0.28*(1-d/thr) : 0.06*(1-d/thr);
            ctx.strokeStyle = sameHeld ? `rgba(10,180,220,${a})` : `rgba(5,98,129,${a})`;
            ctx.lineWidth = sameHeld ? 0.7 : 0.35;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#030d12]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Mouse spotlight */}
      <div aria-hidden="true" className="absolute pointer-events-none" style={{
        left: spotStyle.x, top: spotStyle.y, width: 500, height: 500,
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle, rgba(5,98,129,0.09) 0%, transparent 65%)",
        borderRadius: "50%",
      }} />

      {/* Orbs */}
      <div aria-hidden="true" className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(5,98,129,0.16) 0%, transparent 70%)" }} />
      <div aria-hidden="true" className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(5,98,129,0.1) 0%, transparent 70%)" }} />

      {/* Grid */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(5,98,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(5,98,129,0.04) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Scan line */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="scan-line" />
      </div>

      {/* Top glow */}
      <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(5,98,129,0.7), transparent)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <nav className="flex items-center justify-between px-8 md:px-16 pt-8">
          <Image src="/logo-dark.svg" alt="Webinen" width={160} height={24} priority className="opacity-90" />
          <a href="https://serhat.webinen.com" target="_blank" rel="noopener noreferrer"
            className="text-sm text-[#056281] border border-[#056281]/40 px-4 py-2 rounded-full transition-all duration-300 hover:bg-[#056281]/10 hover:border-[#056281]/80 tracking-wide">
            Portfolio
          </a>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-10 px-4 py-1.5 rounded-full border border-[#056281]/30 bg-[#056281]/5 backdrop-blur-sm">
            <span className="relative flex w-2 h-2" aria-hidden="true">
              <span className="badge-ping absolute inline-flex h-full w-full rounded-full bg-[#056281]/60" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-[#056281]" />
            </span>
            <span className="text-xs tracking-[0.2em] uppercase text-[#056281]/80 font-medium">Something new is coming</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            We build{" "}
            <span style={{ background: "linear-gradient(135deg, #056281, #0a9fcb, #056281)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              digital
            </span>{" "}
            <br className="hidden sm:block" />experiences.
          </h1>

          <p className="max-w-xl text-base md:text-lg text-white/40 mb-16 leading-relaxed">
            Webinen is a design &amp; development studio crafting clean,
            purposeful digital products. Our new website is on the way. Stay tuned.
          </p>

          {/* 3D CTA Button */}
          <div style={{ perspective: "800px" }}>
            <a ref={btnRef} href="https://serhat.webinen.com" target="_blank" rel="noopener noreferrer"
              className="btn-3d group relative inline-flex items-center gap-3 px-9 py-4 rounded-2xl text-sm font-semibold text-white overflow-hidden select-none"
              style={{ ...btnStyle, background: "linear-gradient(160deg, #0a7fa0 0%, #056281 50%, #033f52 100%)", boxShadow: "0 0 0 1px rgba(10,160,200,0.2), 0 8px 32px rgba(5,98,129,0.45), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)", letterSpacing: "0.03em" }}>
              <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />
              <span aria-hidden="true" className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                style={{ opacity: shimmer.opacity, background: `radial-gradient(ellipse 80px 60px at ${shimmer.x}% ${shimmer.y}%, rgba(255,255,255,0.18), transparent)` }} />
              <span aria-hidden="true" className="btn-sweep absolute inset-0 pointer-events-none" />
              <span aria-hidden="true" className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 60%)" }} />
              <span className="relative z-10 flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/15 transition-all duration-300 group-hover:bg-white/20 group-hover:border-white/25">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </span>
              <span className="relative z-10">View Portfolio</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="relative z-10 transition-transform duration-300 group-hover:translate-x-1.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span aria-hidden="true" className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 pointer-events-none blur-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{ background: "rgba(5,98,129,0.7)" }} />
            </a>
          </div>
        </div>

        <footer className="relative px-8 md:px-16 pb-8">
          <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(5,98,129,0.2), transparent)" }} />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
            <p className="text-xs text-white/20 tracking-wide">&copy; {new Date().getFullYear()} Webinen. All rights reserved.</p>
            <a href="https://serhat.webinen.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-white/20 hover:text-[#056281] transition-colors duration-300 tracking-wide">
              serhat.webinen.com
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
