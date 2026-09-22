// src/features/world/Feature.tsx
// The playable world: tile grid, cat sprite, needs bars, and movement controls.
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { GameView } from '@/domain/selectors';
import type { Position } from '@/domain/state';

const CELL = 48; // px per tile
const GARDEN: Position = { lotId: 'home', x: 4, y: 2 };

type NeedBarProps = { label: string; value: number; color: string };

function NeedBar({ label, value, color }: NeedBarProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base">{label}</span>
      <div className="mt-1 h-2 w-16 rounded-full bg-[#e0d6c4] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-[#6b6b6b]">{Math.round(value)}</span>
    </div>
  );
}

export function WorldFeature({ householdId }: { householdId: string }) {
  const [view, setView] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/households/${householdId}/view`, { credentials: 'include' });
    if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return; }
    const data = await res.json();
    setView(data.view);
    setLoading(false);
  }, [householdId]);

  async function handleMoveCat() {
    if (!view || sending) return;
    setSending(true); setError(null);
    const beforeRevision = view.household.revision;
    const res = await fetch(`/api/households/${householdId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'move-cat', payload: { catId: 'mochi', destination: GARDEN } }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `HTTP ${res.status}`);
      setSending(false); return;
    }
    // Poll until revision increases or timeout — read data directly, not via stale state.
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
      const pollRes = await fetch(`/api/households/${householdId}/view`, { credentials: 'include' });
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        setView(pollData.view);
        if (pollData.view.household.revision > beforeRevision) break;
      }
    }
    setSending(false);
  }

  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t); }, [refresh]);

  if (loading) return <Loading />;
  if (!view) return <ErrorView msg={error ?? 'No world data'} />;

  const home = view.home;
  const mochi = view.cats.mochi;
  const gridW = home.width * CELL;
  const gridH = home.height * CELL;

  return (
    <div className="min-h-screen bg-[#f8f5f0] p-4">
      <div className="mx-auto max-w-sm">
        {/* Needs */}
        <div className="mb-3 flex justify-center gap-3">
          <NeedBar label="💤" value={mochi.needs.energy} color="#a8d8a8" />
          <NeedBar label="🐟" value={mochi.needs.hunger} color="#f0a8a8" />
          <NeedBar label="🎾" value={mochi.needs.fun} color="#a8c8f0" />
        </div>

        {/* Garden info */}
        {mochi.position.x === GARDEN.x && mochi.position.y === GARDEN.y ? (
          <p className="mb-2 text-center text-sm text-[#4a4a4a]">Mochi is at the garden!</p>
        ) : (
          <p className="mb-2 text-center text-sm text-[#6b6b6b]">Mochi is at ({mochi.position.x}, {mochi.position.y})</p>
        )}

        {/* World grid */}
        <div className="relative mx-auto rounded-lg border-2 border-[#d9cbb8] bg-[#fdfaf5]" style={{ width: gridW, height: gridH }}>
          {/* Tile grid */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${home.width}, ${CELL}px)`, gridTemplateRows: `repeat(${home.height}, ${CELL}px)` }}
          >
            {Array.from({ length: home.height }).map((_, y) =>
              Array.from({ length: home.width }).map((_, x) => {
                const isBlocked = home.blockedCells.some(b => b.lotId === home.lotId && b.x === x && b.y === y);
                const isGarden = GARDEN.x === x && GARDEN.y === y;
                return (
                  <div
                    key={`${x},${y}`}
                    className={
                      'border border-[#f0e6da] flex items-center justify-center' +
                      (isBlocked ? ' bg-[#e8d8c4]' : isGarden ? ' bg-[#d0f0d0]' : ' bg-[#fdfaf5]')
                    }
                  />
                );
              })
            )}
          </div>

          {/* Cat sprite — Mochi */}
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: mochi.position.x * CELL,
              top: mochi.position.y * CELL,
              width: CELL,
              height: CELL,
            }}
          >
            <span
              className="select-none text-3xl drop-shadow"
              style={{ fontSize: 32, transform: 'translate(-50%, -50%)' }}
            >
              🐱
            </span>
          </div>

          {/* Cat name label */}
          <div
            className="absolute pointer-events-none text-xs font-medium text-[#4a4a4a]"
            style={{
              left: mochi.position.x * CELL + CELL / 2,
              top: mochi.position.y * CELL + CELL + 2,
              transform: 'translateX(-50%)',
            }}
          >
            {mochi.name}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex gap-2">
          <button
            data-testid="move-cat"
            onClick={handleMoveCat}
            disabled={sending || (mochi.position.x === GARDEN.x && mochi.position.y === GARDEN.y)}
            className="flex-1 rounded-lg bg-[#a8d8a8] px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow transition hover:bg-[#90c890] disabled:opacity-50"
          >
            {sending ? 'Moving…' : 'Move to garden'}
          </button>
          <button
            onClick={refresh}
            className="rounded-lg bg-[#e8d5c4] px-3 py-2 text-sm font-medium text-[#4a4a4a] transition hover:bg-[#d9cbb8]"
          >
            ↻
          </button>
        </div>

        {error && <p className="mt-2 text-center text-xs text-[#c86b6b]">{error}</p>}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0]">
      <p className="text-[#4a4a4a]">Loading world…</p>
    </div>
  );
}

function ErrorView({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0]">
      <p className="text-[#4a4a4a]">{msg}</p>
    </div>
  );
}
