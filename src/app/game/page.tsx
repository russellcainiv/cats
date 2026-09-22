// src/app/game/page.tsx — Authenticated game entry.
// Task 01 slice: create and resume a private saved household.
import { Suspense } from 'react';
import { AccessGate } from '@/features/access/AccessGate';

export default function GamePage() {
  return (
    <AccessGate />
  );
}

export const dynamic = 'force-dynamic';
