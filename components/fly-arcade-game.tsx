"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrainCircuit, Gamepad2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type GameMode = "doom" | "halflife";
type Thing = { x: number; y: number; size: number; speed: number; kind: "hazard" | "synapse"; pulse: number };

const WIDTH = 800;
const HEIGHT = 450;

export function FlyArcadeGame({ mode }: { mode: GameMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const keysRef = useRef(new Set<string>());
  const runRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const hold = useCallback((key: string, active: boolean) => {
    if (active) keysRef.current.add(key);
    else keysRef.current.delete(key);
  }, []);

  const start = useCallback(() => {
    runRef.current += 1;
    setScore(0);
    setGameOver(false);
    setPlaying(true);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      keysRef.current.add(event.key.toLowerCase());
      if ((event.key === " " || event.key === "Enter") && !playing) start();
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [playing, start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const player = { x: mode === "doom" ? 105 : 400, y: 225, r: 21 };
    let things: Thing[] = [];
    let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    let elapsed = 0;
    let spawn = 0;
    let localScore = 0;
    let last = performance.now();
    const run = runRef.current;

    const burst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 14; i++) particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .5) * 180, life: 1, color });
    };

    const drawFly = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      const bob = Math.sin(elapsed * 13) * 2;
      ctx.translate(0, bob);
      ctx.globalAlpha = .6;
      ctx.fillStyle = "#dfffc5";
      ctx.beginPath(); ctx.ellipse(-20, -5, 23, 10, -.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(20, -5, 23, 10, .35, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#27301d"; ctx.strokeStyle = "#d6fc70"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 5, 15, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ff5f59";
      ctx.beginPath(); ctx.arc(-9, -13, 10, 0, Math.PI * 2); ctx.arc(9, -13, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#d6fc70"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10,-16); ctx.lineTo(0,-8); ctx.lineTo(10,-17); ctx.moveTo(0,-8); ctx.lineTo(0,1); ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      const doom = mode === "doom";
      ctx.fillStyle = doom ? "#07130b" : "#100c1f";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = doom ? "#29472c" : "#352a58";
      ctx.lineWidth = 1;
      for (let x = -((elapsed * (doom ? 85 : 25)) % 40); x < WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
      for (let y = 0; y < HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }

      if (doom) {
        ctx.fillStyle = "#102817";
        ctx.fillRect(0, 0, WIDTH, 45); ctx.fillRect(0, HEIGHT - 45, WIDTH, 45);
        ctx.fillStyle = "#d6fc70"; ctx.font = "bold 11px monospace";
        ctx.fillText("DOOMFLY // NEURAL TUNNEL", 18, 27);
      } else {
        ctx.strokeStyle = "#63d9ff55"; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(WIDTH/2, HEIGHT/2, 85+i*55 + Math.sin(elapsed+i)*7, 0, Math.PI*2); ctx.stroke(); }
        ctx.fillStyle = "#bca2ff"; ctx.font = "bold 11px monospace";
        ctx.fillText("FLYBRAIN LAB // SYNAPSE HARVEST", 18, 27);
      }

      for (const item of things) {
        const pulse = 1 + Math.sin(item.pulse) * .13;
        ctx.save(); ctx.translate(item.x, item.y); ctx.scale(pulse, pulse);
        if (item.kind === "synapse") {
          ctx.shadowColor = "#d6fc70"; ctx.shadowBlur = 18; ctx.fillStyle = "#d6fc70";
          ctx.beginPath();
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const r = i % 2 ? item.size * .45 : item.size; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
          ctx.closePath(); ctx.fill();
        } else if (doom) {
          ctx.shadowColor = "#ff4f54"; ctx.shadowBlur = 12; ctx.fillStyle = "#681f24"; ctx.strokeStyle = "#ff6268"; ctx.lineWidth = 3;
          ctx.fillRect(-item.size, -item.size, item.size*2, item.size*2); ctx.strokeRect(-item.size, -item.size, item.size*2, item.size*2);
          ctx.fillStyle = "#ffb6a3"; ctx.fillRect(-item.size*.55,-5,7,7); ctx.fillRect(item.size*.25,-5,7,7);
        } else {
          ctx.strokeStyle = "#ff5d8f"; ctx.lineWidth = 5; ctx.shadowColor = "#ff2f75"; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(0,0,item.size,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-item.size,0); ctx.lineTo(item.size,0); ctx.moveTo(0,-item.size); ctx.lineTo(0,item.size); ctx.stroke();
        }
        ctx.restore();
      }
      for (const p of particles) { ctx.globalAlpha = Math.max(0,p.life); ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,4,4); }
      ctx.globalAlpha = 1;
      drawFly(player.x, player.y);
      ctx.fillStyle = "#f4f5eb"; ctx.font = "900 18px monospace"; ctx.textAlign = "right"; ctx.fillText(String(localScore).padStart(6,"0"), WIDTH-18, 28); ctx.textAlign = "left";
      ctx.fillStyle = "#9ba88d"; ctx.font = "10px monospace"; ctx.fillText(doom ? "DODGE RED BUGS · COLLECT SYNAPSES" : "HARVEST SYNAPSES · AVOID PULSES", 18, HEIGHT-17);
    };

    const loop = (now: number) => {
      if (run !== runRef.current) return;
      const dt = Math.min((now - last) / 1000, .035); last = now; elapsed += dt; spawn -= dt;
      const keys = keysRef.current;
      const speed = mode === "doom" ? 245 : 220;
      if (keys.has("arrowup") || keys.has("w")) player.y -= speed * dt;
      if (keys.has("arrowdown") || keys.has("s")) player.y += speed * dt;
      if (keys.has("arrowleft") || keys.has("a")) player.x -= speed * dt;
      if (keys.has("arrowright") || keys.has("d")) player.x += speed * dt;
      player.x = Math.max(35, Math.min(WIDTH-35, player.x)); player.y = Math.max(58, Math.min(HEIGHT-58, player.y));

      if (spawn <= 0) {
        const synapse = Math.random() < .32;
        const edge = mode === "halflife" ? Math.floor(Math.random()*4) : 1;
        let x = WIDTH+35, y = 65+Math.random()*(HEIGHT-130);
        if (mode === "halflife") {
          if (edge===0) { x=Math.random()*WIDTH; y=-30; } if (edge===1) x=WIDTH+30;
          if (edge===2) { x=Math.random()*WIDTH; y=HEIGHT+30; } if (edge===3) x=-30;
        }
        things.push({ x, y, size: synapse ? 12 : 18+Math.random()*13, speed: 105+Math.random()*75+localScore*.4, kind: synapse ? "synapse" : "hazard", pulse: Math.random()*6 });
        spawn = Math.max(.28, .72 - localScore*.006);
      }

      for (const item of things) {
        item.pulse += dt*5;
        if (mode === "doom") item.x -= item.speed*dt;
        else { const dx=player.x-item.x, dy=player.y-item.y, length=Math.hypot(dx,dy)||1; item.x += dx/length*item.speed*dt; item.y += dy/length*item.speed*dt; }
        const hit = Math.hypot(item.x-player.x,item.y-player.y) < item.size+player.r*.68;
        if (hit && item.kind === "synapse") { item.x=-999; localScore += 10; setScore(localScore); burst(player.x,player.y,"#d6fc70"); }
        else if (hit) {
          burst(player.x,player.y,"#ff5f59"); draw(); setBest(v => Math.max(v,localScore)); setPlaying(false); setGameOver(true); return;
        }
      }
      things = things.filter(item => item.x>-80 && item.x<WIDTH+80 && item.y>-80 && item.y<HEIGHT+80);
      for (const p of particles) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt*2; }
      particles=particles.filter(p=>p.life>0);
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };
    draw();
    if (playing) frameRef.current = requestAnimationFrame(loop);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [mode, playing]);

  return <div className={`browser-game ${mode}`}>
    <div className="game-hud"><span><BrainCircuit/> LIVE BRAIN LINK</span><strong>SCORE {String(score).padStart(6,"0")}</strong><span>BEST {String(best).padStart(6,"0")}</span></div>
    <div className="canvas-wrap">
      <canvas ref={canvasRef} aria-label={`${mode === "doom" ? "DoomFly" : "FlyBrain Half-Life"} browser arcade game`}/>
      {!playing && <div className="game-start"><Gamepad2/><strong>{gameOver ? "SIGNAL LOST" : "READY, PILOT?"}</strong><p>{gameOver ? `Brain score: ${score}` : "Move the fly. Collect neural sparks. Avoid everything angry."}</p><Button onClick={start}>{gameOver ? <RotateCcw/> : <Gamepad2/>}{gameOver ? "Try again" : "Start game"}</Button></div>}
    </div>
    <div className="game-controls" aria-label="Touch controls">
      <button aria-label="Move left" onPointerDown={()=>hold("arrowleft",true)} onPointerUp={()=>hold("arrowleft",false)} onPointerLeave={()=>hold("arrowleft",false)}>←</button>
      <div><button aria-label="Move up" onPointerDown={()=>hold("arrowup",true)} onPointerUp={()=>hold("arrowup",false)} onPointerLeave={()=>hold("arrowup",false)}>↑</button><button aria-label="Move down" onPointerDown={()=>hold("arrowdown",true)} onPointerUp={()=>hold("arrowdown",false)} onPointerLeave={()=>hold("arrowdown",false)}>↓</button></div>
      <button aria-label="Move right" onPointerDown={()=>hold("arrowright",true)} onPointerUp={()=>hold("arrowright",false)} onPointerLeave={()=>hold("arrowright",false)}>→</button>
      <span>ARROWS / WASD</span>
    </div>
  </div>;
}
