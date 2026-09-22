// src/features/access/HouseholdShell.tsx
// Task 01: shows the household loaded and ready to resume.
// Task 02: adds "Enter home" button to launch the world.
// Task 04: adds cat creator inventory for real & fictional cats.
'use client';
import { useState, useEffect } from 'react';
import type { Position } from '@/domain/state';
import type { GameView } from '@/domain/selectors';
import { CatCreator } from '@/features/creator/CatCreator';

type Props = {
  householdId: string;
  ownerId: string;
};

const GARDEN: Position = { lotId: 'home', x: 4, y: 2 };

export function HouseholdShell({ householdId, ownerId }: Props) {
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<GameView | null>(null);

  const fetchView = async () => {
    const res = await fetch(`/api/households/${householdId}/view`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      setView(data.view);
    }
  };

  useEffect(() => { fetchView(); }, [householdId]);

  const handleEnterHome = async () => {
    setEntering(true);
    setError(null);
    const res = await fetch(`/api/households/${householdId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'launch-world', payload: {} }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `HTTP ${res.status}`);
      setEntering(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0]">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-[#fff8f0] p-6 shadow-md">
        <h1 className="text-center text-lg font-bold text-[#4a4a4a]">Household ready</h1>
        <p className="text-center text-sm text-[#6b6b6b] break-all" data-testid="household-id">ID: {householdId}</p>
        <p className="text-center text-xs text-[#8a8a8a]">Owner: {ownerId.slice(0, 8)}…</p>
        <CatCreator
          householdId={householdId}
          currentCatCount={view ? Object.keys(view.cats).length : 0}
          onCatCreated={fetchView}
        />
        <button
          data-testid="enter-home"
          onClick={handleEnterHome}
          disabled={entering}
          className="w-full rounded-lg bg-[#a8d8a8] px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow transition hover:bg-[#90c890] disabled:opacity-50"
        >
          {entering ? 'Entering…' : 'Enter home'}
        </button>
        <button
          onClick={() => (window.location.href = '/api/auth/sign-out?redirect=' + encodeURIComponent(window.location.origin + '/game'))}
          className="w-full rounded bg-[#e8d5c4] px-4 py-2 text-sm font-medium text-[#4a4a4a] transition hover:bg-[#d9cbb8]"
        >
          Sign out
        </button>
        {error && <p className="text-center text-xs text-[#c86b6b]">{error}</p>}
      </div>
    </div>
  );
}
