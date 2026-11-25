import React, { useEffect, useMemo, useRef, useState } from 'react';

type Piece = 'bone' | 'camiseta' | 'polo';

const PIECES: { id: Piece; label: string; match: RegExp; depth: number }[] = [
  { id: 'bone', label: 'Boné', match: /bon[eé]/i, depth: 46 },
  { id: 'camiseta', label: 'Camiseta', match: /camiseta|camisa(?!\s*polo)/i, depth: 22 },
  { id: 'polo', label: 'Polo', match: /polo/i, depth: 22 },
];

const FILES: Record<Piece, { navy: string; cinza: string }> = {
  bone: { navy: '/mockups/bone_navy.webp', cinza: '/mockups/bone_cinza.webp' },
  camiseta: { navy: '/mockups/cam_navy.webp', cinza: '/mockups/cam_cinza.webp' },
  polo: { navy: '/mockups/polo_navy.webp', cinza: '/mockups/polo_cinza.webp' },
};

/** Peça em camadas (espessura real) que gira sozinha; arraste para girar. */
const Spin: React.FC<{ src: string; depth: number; label: string }> = ({ src, depth, label }) => {
  const objRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.8);
  const H = 250;
  const N = Math.max(10, Math.round(depth / 2));

  useEffect(() => {
    const im = new Image();
    im.onload = () => setRatio(im.naturalWidth / im.naturalHeight);
    im.src = src;
  }, [src]);

  const st = useRef({ ang: -25, dragging: false, lx: 0, resume: 0, raf: 0 });
  useEffect(() => {
    const s = st.current;
    const paint = () => {
      if (objRef.current) objRef.current.style.transform = `rotateX(-4deg) rotateY(${s.ang}deg)`;
    };
    const tick = (t: number) => {
      if (!s.dragging && t > s.resume) s.ang += 0.45;
      paint();
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
  }, []);

  const down = (e: React.PointerEvent) => {
    st.current.dragging = true;
    st.current.lx = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.dragging) return;
    s.ang += (e.clientX - s.lx) * 0.6;
    s.lx = e.clientX;
  };
  const up = () => {
    st.current.dragging = false;
    st.current.resume = performance.now() + 1200;
  };

  const w = ratio * H;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative select-none cursor-grab active:cursor-grabbing"
        style={{
          height: 290,
          perspective: 1100,
          touchAction: 'pan-y',
          background: 'radial-gradient(ellipse at 50% 38%, #ffffff 0%, #eef0f5 55%, #dfe3ec 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute', left: '50%', bottom: 22, width: '56%', height: 18, marginLeft: '-28%', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(15,31,74,.28), rgba(15,31,74,0) 70%)',
          }}
        />
        <div ref={objRef} style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformStyle: 'preserve-3d' }}>
          {Array.from({ length: N + 1 }).map((_, k) => {
            const z = -depth / 2 + (depth * k) / N;
            const mid = k > 0 && k < N;
            return (
              <img
                key={k}
                src={src}
                alt={k === N ? label : ''}
                draggable={false}
                style={{
                  position: 'absolute', left: 0, top: 0, height: H, width: w,
                  marginLeft: -w / 2, marginTop: -H / 2 - 6,
                  transform: `translateZ(${z.toFixed(2)}px)`,
                  pointerEvents: 'none',
                  filter: mid ? 'brightness(.42) saturate(.7)' : undefined,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-white/10">{label}</div>
    </div>
  );
};

interface Props {
  items: { description: string }[];
}

const Mockup3D: React.FC<Props> = ({ items }) => {
  const detected = useMemo(
    () => PIECES.filter(p => items.some(i => p.match.test(i.description || ''))).map(p => p.id),
    [items]
  );
  const available = detected.length ? PIECES.filter(p => detected.includes(p.id)) : PIECES;
  const [piece, setPiece] = useState<Piece>(available[0].id);

  // ao adicionar um item (ex.: "Boné"), a peça certa abre automaticamente
  useEffect(() => {
    if (detected.length && !detected.includes(piece)) setPiece(detected[0]);
  }, [detected.join(',')]);

  const cfg = PIECES.find(p => p.id === piece)!;
  const chip = (active: boolean) =>
    `h-8 px-3 text-xs font-semibold rounded-lg border transition-colors ${
      active ? 'bg-primary text-slate-900 border-primary' : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-primary'
    }`;

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white leading-7">Visualização 3D da peça</h2>
        <p className="text-xs text-slate-500">
          {detected.length ? 'Peça detectada pelos itens da proposta · arraste para girar' : 'Adicione um item (Boné, Camiseta, Polo) para abrir a peça certa'}
        </p>
      </div>
      <div className="flex gap-1.5 mb-4">
        {available.map(p => (
          <button key={p.id} className={chip(piece === p.id)} onClick={() => setPiece(p.id)}>{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Spin src={FILES[piece].navy} depth={cfg.depth} label={`${cfg.label} azul-marinho`} />
        <Spin src={FILES[piece].cinza} depth={cfg.depth} label={`${cfg.label} cinza-chumbo`} />
      </div>
    </div>
  );
};

export default Mockup3D;
