import { Suspense } from 'react';
import { MatchInsightsPage } from '@/components/history/insights/MatchInsightsPage';

async function MatchInsightsLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MatchInsightsPage matchId={id} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--bg)]" />}>
      <MatchInsightsLoader params={params} />
    </Suspense>
  );
}
