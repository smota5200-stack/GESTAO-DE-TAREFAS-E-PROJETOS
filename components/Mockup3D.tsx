import React, { useEffect, useMemo, useRef, useState } from 'react';

type Piece = 'bone' | 'camiseta' | 'polo';
type Tone = 'navy' | 'cinza';

const PIECES: { id: Piece; label: string; match: RegExp }[] = [
  { id: 'bone', label: 'Boné', match: /bon[eé]/i },
  { id: 'camiseta', label: 'Camiseta', match: /camiseta|camisa(?!\s*polo)/i },
  { id: 'polo', label: 'Polo', match: /polo/i },
];

// Fotos de referência (arte Foggiatto aplicada). Substitua por uma imagem sua com "Usar minha imagem".
const PRESETS: Record<Piece, Record<Tone, string>> = {
  bone: { navy: '/mockups/bone_navy.jpg', cinza: '/mockups/bone_cinza.jpg' },
  camiseta: { navy: '/mockups/cam_navy1.jpg', cinza: '/mockups/cam_cinza.jpg' },
  polo: { navy: '/mockups/polo_logo.jpg', cinza: '/mockups/polo_logo.jpg' },
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
  const [tone, setTone] = useState<Tone>('navy');
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // quando o item muda (ex.: o usuário adiciona "Boné"), mostra a peça automaticamente
  useEffect(() => {
    if (detected.length && !detected.includes(piece)) setPiece(detected[0]);
  }, [detected.join(',')]);

  const key = `${piece}-${tone}`;
  const src = custom[key] || PRESETS[piece][tone];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 16, y: px * 20 });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCustom(c => ({ ...c, [key]: String(reader.result) }));
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const chip = (active: boolean) =>
    `h-8 px-3 text-xs font-semibold rounded-lg border transition-colors ${
      active ? 'bg-primary text-slate-900 border-primary' : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-primary'
    }`;

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white leading-7">Visualização 3D da peça</h2>
          <p className="text-xs text-slate-500">
            {detected.length ? 'Peça detectada pelos itens da proposta' : 'Adicione um item (Boné, Camiseta, Polo) para abrir a peça certa'}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button className={chip(tone === 'navy')} onClick={() => setTone('navy')}>Azul-marinho</button>
          <button className={chip(tone === 'cinza')} onClick={() => setTone('cinza')}>Cinza</button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {available.map(p => (
          <button key={p.id} className={chip(piece === p.id)} onClick={() => setPiece(p.id)}>{p.label}</button>
        ))}
      </div>

      <div
        style={{ perspective: 900 }}
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="rounded-xl bg-slate-100 dark:bg-black/30 overflow-hidden"
      >
        <img
          src={src}
          alt={`Mockup 3D ${piece}`}
          draggable={false}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform .12s ease-out',
            transformStyle: 'preserve-3d',
            maxHeight: 360,
            margin: '0 auto',
            display: 'block',
            objectFit: 'contain',
            filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.28))',
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-slate-500">Passe o mouse para girar</span>
        <div className="flex gap-2">
          {custom[key] && (
            <button className={chip(false)} onClick={() => setCustom(c => { const n = { ...c }; delete n[key]; return n; })}>Restaurar</button>
          )}
          <button className={chip(false)} onClick={() => fileRef.current?.click()}>Usar minha imagem</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} />
        </div>
      </div>
    </div>
  );
};

export default Mockup3D;
