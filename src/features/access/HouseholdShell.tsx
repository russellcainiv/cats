// src/features/access/HouseholdShell.tsx
// Task 01: shows the household loaded and ready to resume.
'use client';
// Task 02 adds cat selection + world canvas here.

type Props = {
  householdId: string;
  ownerId: string;
};

export function HouseholdShell({ householdId, ownerId }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0]">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-[#fff8f0] p-6 shadow-md">
        <h1 className="text-center text-lg font-bold text-[#4a4a4a]">Household ready</h1>
        <p className="text-center text-sm text-[#6b6b6b] break-all" data-testid="household-id">ID: {householdId}</p>
        <p className="text-center text-xs text-[#8a8a8a]">Owner: {ownerId.slice(0, 8)}…</p>
        <p className="text-center text-sm text-[#6b6b6b] mt-4">
          Cat canvas loads here in the next slice. Sign out to resume elsewhere.
        </p>
        <button
          onClick={() => document.location.href = '/api/auth/sign-out?redirect=' + encodeURIComponent(window.location.origin + '/game')}
          className="w-full rounded bg-[#e8d5c4] px-4 py-2 text-sm font-medium text-[#4a4a4a] transition hover:bg-[#d9cbb8]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
