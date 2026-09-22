// src/features/access/AccessGate.tsx — Robust version with error handling
'use client';
import { useState, useEffect } from 'react';
import { CreateForm } from '@/features/access/CreateForm';
import { HouseholdShell } from '@/features/access/HouseholdShell';
import { WorldFeature } from '@/features/world/Feature';

export function AccessGate() {
  const [ready, setReady] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Try to read the session (cookie set by openScenario or dev-issue-session).
        const res = await fetch('/api/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setOwnerId(data.ownerId ?? null);
            setHouseholdId(data.householdId ?? null);
            setLaunched(data.launched ?? false);
            setReady(true);
          }
          return;
        }

        // No session — in dev, auto-issue one.
        if (process.env.NODE_ENV !== 'production') {
          const issueRes = await fetch('/api/dev/issue-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
          });
          if (issueRes.ok) {
            // Retry session check — the dev endpoint sets the cookie via Set-Cookie.
            const retry = await fetch('/api/session', { credentials: 'include' });
            if (retry.ok) {
              const data = await retry.json();
              if (!cancelled) {
                setOwnerId(data.ownerId ?? null);
                setHouseholdId(data.householdId ?? null);
                setLaunched(data.launched ?? false);
                setReady(true);
              }
              return;
            }
          }
        }

        // Fallback: local dev owner, no auth server needed.
        if (!cancelled) {
          setOwnerId('dev-owner-' + Math.random().toString(36).slice(2, 10));
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Unknown error');
          setReady(true); // proceed anyway with dev fallback
        }
      }
    }

    init();
    // Safety timeout: if the server is unreachable, still show UI.
    setTimeout(() => {
      if (!ready && !loadError) {
        setOwnerId('dev-owner-' + Math.random().toString(36).slice(2, 10));
        setReady(true);
      }
    }, 3000).unref?.();

    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0]">
        <p className="text-[#4a4a4a]">Loading your cats…</p>
      </div>
    );
  }

  if (householdId && launched) {
    return <WorldFeature householdId={householdId} />;
  }

  if (householdId) {
    return <HouseholdShell householdId={householdId} ownerId={ownerId!} />;
  }

  return <CreateForm ownerId={ownerId} onCreated={setHouseholdId} />;
}
