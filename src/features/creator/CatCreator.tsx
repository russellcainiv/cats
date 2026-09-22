// src/features/creator/CatCreator.tsx — Create real or imaginary cats (CATS-5).
// R04: phone + computer parity. R07: real & fictional cats. R20: capacity.
'use client';
import { useState } from 'react';
import { catCatalog } from '@/content/cat-catalog';

type Props = {
  householdId: string;
  maxCats?: number;
  currentCatCount: number;
  onCatCreated?: () => void;
};

export function CatCreator({ householdId, maxCats = 8, currentCatCount, onCatCreated }: Props) {
  const [name, setName] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<string>(catCatalog.appearances[0].variant);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCapacity = currentCatCount >= maxCats;
  const disabled = atCapacity || submitting || !name.trim();

  const toggleTrait = (traitId: string) => {
    if (selectedTraits.includes(traitId)) {
      setSelectedTraits(selectedTraits.filter(t => t !== traitId));
    } else if (selectedTraits.length < 3) {
      setSelectedTraits([...selectedTraits, traitId]);
    }
  };

  const handleSubmit = async () => {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/households/${householdId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'create-cat',
          payload: {
            name,
            appearance: { variant: selectedVariant },
            traits: selectedTraits.map(id => ({ id, level: 50 })),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `HTTP ${res.status}`);
        return;
      }
      // Reset form for next creation.
      setName('');
      setSelectedTraits([]);
      setSelectedVariant(catCatalog.appearances[0].variant);
      onCatCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create cat');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAppearance = catCatalog.appearances.find(a => a.variant === selectedVariant);
  const previewEmoji = selectedAppearance?.emoji ?? '🐱';
  const traitLabels = selectedTraits.map(id =>
    catCatalog.traits.find(t => t.id === id)?.label ?? id
  ).join(', ');

  return (
    <div className="w-full max-w-sm space-y-4">
      <h2 className="text-center text-lg font-bold text-[#4a4a4a]">Create a New Cat</h2>

      {atCapacity && (
        <p className="text-center text-sm text-[#c86b6b]">
          Maximum {maxCats} cats reached. Adopt after loss to continue.
        </p>
      )}

      {/* Name — R07: Unicode names supported, blank rejected */}
      <div>
        <label className="block text-sm font-medium text-[#4a4a4a] mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Luna"
          maxLength={50}
          disabled={atCapacity || submitting}
          className="w-full rounded-lg border-2 border-[#e0d6c4] px-3 py-2 text-sm focus:border-[#a8d8a8] focus:outline-none disabled:opacity-50"
        />
        {!name.trim() && <p className="mt-1 text-xs text-[#c86b6b]">Name cannot be blank</p>}
      </div>

      {/* Appearance — R07: preview changes affect sprite */}
      <div>
        <label className="block text-sm font-medium text-[#4a4a4a] mb-1">Coat</label>
        <div className="space-y-1">
          {catCatalog.appearances.map(a => (
            <button
              key={a.variant}
              type="button"
              data-testid={`appearance-${a.variant}`}
              onClick={() => setSelectedVariant(a.variant)}
              disabled={atCapacity || submitting}
              className={
                'flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition ' +
                (selectedVariant === a.variant
                  ? 'border-[#a8d8a8] bg-[#f0faf0]'
                  : 'border-[#e0d6c4] hover:border-[#d9cbb8]') +
                ' disabled:opacity-50'
              }
            >
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <div className="font-medium text-[#4a4a4a]">{a.label}</div>
                <div className="text-xs text-[#6b6b6b]">{a.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Traits — R07: max 3 per cat */}
      <div>
        <label className="block text-sm font-medium text-[#4a4a4a] mb-1">
          Personality Traits (max 3)
        </label>
        <div className="space-y-1">
          {catCatalog.traits.map(t => {
            const checked = selectedTraits.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`trait-${t.id}`}
                onClick={() => toggleTrait(t.id)}
                disabled={atCapacity || submitting || (!checked && selectedTraits.length >= 3)}
                className={
                  'flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-left transition ' +
                  (checked
                    ? 'border-[#a8d8a8] bg-[#f0faf0]'
                    : 'border-[#e0d6c4] hover:border-[#d9cbb8]') +
                    ' disabled:opacity-50'
                }
              >
                <div>
                  <div className="font-medium text-[#4a4a4a]">{t.label}</div>
                  <div className="text-xs text-[#6b6b6b]">{t.description}</div>
                </div>
                {checked && <span className="text-sm text-[#a8d8a8]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview — R07: preview changes affect sprite and portrait */}
      <div data-testid="cat-preview" className="rounded-lg border-2 border-[#e0d6c4] bg-[#fdfaf5] p-4 text-center">
        <div className="text-4xl mb-1">{previewEmoji}</div>
        <div className="font-bold text-[#4a4a4a]">{name || 'New Cat'}</div>
        {traitLabels && <div className="text-xs text-[#6b6b6b]">{traitLabels}</div>}
      </div>

      {/* Submit — R04: phone keyboard won't obscure because form is scrollable */}
      <button
        data-testid="create-cat-btn"
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full rounded-lg bg-[#a8d8a8] px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow transition hover:bg-[#90c890] disabled:opacity-50"
      >
        {submitting ? 'Creating…' : atCapacity ? 'At Capacity' : 'Create Cat'}
      </button>

      {error && <p className="text-center text-xs text-[#c86b6b]">{error}</p>}
    </div>
  );
}
