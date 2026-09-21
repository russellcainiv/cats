// src/features/access/CreateForm.tsx
// Real interaction surface for creating a private household.
'use client';
import { useState } from 'react';

type Props = {
  ownerId: string | null;
  onCreated: (householdId: string) => void;
};

export function CreateForm({ ownerId, onCreated }: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (creating) return; // prevent double-tap duplicates
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() || 'My cats' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const envelope = await res.json();
      onCreated(envelope.householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create household');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0]">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-[#fff8f0] p-6 shadow-md">
        <h1 className="text-center text-lg font-bold text-[#4a4a4a]">Create your household</h1>
        <p className="text-center text-sm text-[#6b6b6b]">Name it and start playing</p>

        <div>
          <label htmlFor="household-name" className="block text-xs font-medium text-[#4a4a4a]">
            Household name
          </label>
          <input
            id="household-name"
            type="text"
            aria-label="Household name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My cats"
            className="mt-1 w-full rounded border border-[#d9cbb8] px-3 py-2 text-sm focus:border-[#a8d5a8] focus:outline-none"
            maxLength={64}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          aria-label="Create household"
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded bg-[#a8d5a8] px-4 py-2 text-sm font-medium text-[#3a5a3a] transition hover:bg-[#8bc98b] disabled:opacity-50"
        >
          {creating ? 'Saving…' : 'Create household'}
        </button>
      </div>
    </div>
  );
}
