// src/features/world/Feature.tsx
// The playable world: tile grid, cat sprite, needs bars, movement controls,
// pause/sync-and-save with lease epoch, CAS, idempotency, and conflict recovery.
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameView } from '@/domain/selectors';
import type { Position } from '@/domain/state';
import { computeChecksum, SCHEMA_VERSION } from '@/domain/save-schema';
import type { SaveEnvelope } from '@/domain/save-schema';

const CELL = 48; // px per tile
const GARDEN: Position = { lotId: 'home', x: 4, y: 2 };
const SAVE_INTERVAL = 5000; // 5 seconds

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

  // CATS-4: sync-and-pause state.
  const [saveStatus, setSaveStatus] = useState<string>('idle');
  const [leaseEpoch, setLeaseEpoch] = useState<number>(0);
  const [conflict, setConflict] = useState(false);

  // Refs for use inside interval callbacks (avoids stale closures).
  const envelopeRef = useRef<SaveEnvelope | null>(null);
  const viewRef = useRef<GameView | null>(null);
  const leaseEpochRef = useRef(0);

  // Fetch the view (for rendering) and the resume envelope (for saving).
  const refresh = useCallback(async () => {
    try {
      const viewRes = await fetch(`/api/households/${householdId}/view`, { credentials: 'include' });
      if (!viewRes.ok) { setError(`HTTP ${viewRes.status}`); setLoading(false); return; }
      const viewData = await viewRes.json();
      setView(viewData.view);
      viewRef.current = viewData.view;
      setLoading(false);

      const resumeRes = await fetch(`/api/households/${householdId}`, { credentials: 'include' });
      if (resumeRes.ok) {
        const env = await resumeRes.json();
        envelopeRef.current = env;
      } else {
        console.error('[WorldFeature] resume fetch failed:', resumeRes.status);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setSaveStatus('Reconnecting…');
      setLoading(false);
    }
  }, [householdId]);

  // Fetch lease epoch from session on mount.
  const fetchLeaseEpoch = useCallback(async () => {
    try {
      const res = await fetch(`/api/session`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeaseEpoch(data.leaseEpoch ?? 0);
      }
    } catch {
      // Non-fatal — lease will be validated on save.
    }
  }, []);

  async function handleMoveCat() {
    if (!viewRef.current || sending) return;
    setSending(true); setError(null);
    const beforeRevision = viewRef.current.household.revision;
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
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
      const pollRes = await fetch(`/api/households/${householdId}/view`, { credentials: 'include' });
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        setView(pollData.view);
        viewRef.current = pollData.view;
        if (pollData.view.household.revision > beforeRevision) break;
      }
    }
    await refresh();
    setSending(false);
  }

  // CATS-4: auto-save with CAS + lease epoch + idempotency.
  // Constructs a clean SaveEnvelope (without householeaseEpoch) so the
  // checksum matches what the server validates.
  async function saveEnvelope(paused: boolean): Promise<void> {
    const env = envelopeRef.current;
    if (!env || !viewRef.current) return;

    const saveEnv: SaveEnvelope = {
      schemaVersion: env.schemaVersion ?? SCHEMA_VERSION,
      household: {
        id: env.household.id,
        ownerId: env.household.ownerId,
        name: env.household.name,
        seed: env.household.seed,
        revision: env.household.revision,
        createdAt: env.household.createdAt,
        launched: env.household.launched,
      },
      cats: env.cats,
      home: env.home,
      simMinute: env.simMinute ?? 0,
      paused,
      checksum: '',
    };
    saveEnv.checksum = computeChecksum(saveEnv);

    const currentLease = leaseEpochRef.current;

    setSaveStatus('Saving…');
    try {
      const res = await fetch(`/api/households/${householdId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...saveEnv,
          requestId: `${env.household.id}-${Date.now()}`,
          expectedRevision: env.household.revision,
          leaseEpoch: currentLease,
        }),
      });

      if (res.status === 409) {
        setConflict(true);
        setSaveStatus('Lease conflict');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || data.message || `Save HTTP ${res.status}`);
        setSaveStatus('Reconnecting…');
        return;
      }

      const data = await res.json();
      if (envelopeRef.current) {
        envelopeRef.current = {
          ...envelopeRef.current,
          household: { ...envelopeRef.current.household, revision: data.revision },
        };
      }
      setSaveStatus('Saved');
      setConflict(false);
    } catch {
      setSaveStatus('Reconnecting…');
    }
  }

  // CATS-4: take over the lease from another device.
  async function handleTakeover() {
    try {
      const res = await fetch(`/api/households/${householdId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.leaseEpoch !== undefined) {
          setLeaseEpoch(data.leaseEpoch);
          leaseEpochRef.current = data.leaseEpoch;
        }
        setConflict(false);
        setSaveStatus('Saved');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Takeover HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Takeover failed');
    }
  }

  async function handlePause() {
    if (!view || !envelopeRef.current) return;
    await saveEnvelope(true);
    setView(prev => prev ? { ...prev, paused: true } : prev);
    viewRef.current = { ...viewRef.current!, paused: true };
    await refresh();
  }

  async function handleResume() {
    await saveEnvelope(false);
    setView(prev => prev ? { ...prev, paused: false } : prev);
    viewRef.current = { ...viewRef.current!, paused: false };
    await refresh();
  }

  // CATS-4: auto-save interval + visibility change (pause on blur).
  useEffect(() => {
    fetchLeaseEpoch();
    void refresh();

    const interval = setInterval(() => {
      if (viewRef.current?.paused) return;
      void saveEnvelope(false);
    }, SAVE_INTERVAL);

    const handleVisibility = async () => {
      if (document.hidden && viewRef.current && !viewRef.current.paused) {
        await saveEnvelope(true);
        setView(prev => prev ? { ...prev, paused: true } : prev);
        viewRef.current = { ...viewRef.current, paused: true };
      } else if (!document.hidden && viewRef.current?.paused) {
        setView(prev => prev ? { ...prev, paused: false } : prev);
        viewRef.current = { ...viewRef.current, paused: false };
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh, fetchLeaseEpoch]);

  // Periodic view refresh for multiplayer sync.
  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

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

        {/* Position info */}
        {mochi.position.x === GARDEN.x && mochi.position.y === GARDEN.y ? (
          <p className="mb-2 text-center text-sm text-[#4a4a4a]">Mochi is at the garden!</p>
        ) : (
          <p className="mb-2 text-center text-sm text-[#6b6b6b]">Mochi is at ({mochi.position.x}, {mochi.position.y})</p>
        )}

        {/* World grid */}
        <div className="relative mx-auto rounded-lg border-2 border-[#d9cbb8] bg-[#fdfaf5]" style={{ width: gridW, height: gridH }}>
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

          {/* Cat sprite */}
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

        {/* CATS-4: Pause / Resume / Continue here */}
        {view.paused ? (
          <button
            data-testid="resume-btn"
            onClick={handleResume}
            className="mt-2 w-full rounded-lg bg-[#f0e8c4] px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow transition hover:bg-[#e8d5b0]"
          >
            Resume simulation
          </button>
        ) : (
          <button
            data-testid="pause-btn"
            onClick={handlePause}
            className="mt-2 w-full rounded-lg bg-[#f0e8c4] px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow transition hover:bg-[#e8d5b0]"
          >
            Pause
          </button>
        )}

        {/* CATS-4: Continue here — always available to claim lease / resume after conflict. */}
        <button
          data-testid="takeover-btn"
          onClick={handleTakeover}
          className="mt-2 w-full rounded-lg bg-[#c8e6c8] px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow transition hover:bg-[#b0d8b0]"
        >
          Continue here
        </button>

        {/* CATS-4: save status */}
        <div
          data-testid="save-status"
          className="mt-2 text-center text-xs text-[#6b6b6b]"
        >
          {saveStatus}
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
