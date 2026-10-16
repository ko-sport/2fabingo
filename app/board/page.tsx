import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listMarks, listRecent } from "@/lib/marks-data";
import { loadTeam } from "@/lib/teams";
import { BoardApp } from "@/components/board-app";
import { BoardFallback } from "@/components/board-fallback";
import { blockedDatabase } from "@/components/database-notice";

type Search = { session?: string | string[] };

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<BoardFallback />}>
      <BoardGate searchParams={searchParams} />
    </Suspense>
  );
}

async function BoardGate({ searchParams }: { searchParams: Promise<Search> }) {
  const blocked = await blockedDatabase();
  if (blocked) return blocked;
  const session = firstParam((await searchParams).session);
  const user = await getCurrentUser(session);
  const marks = await listMarks(user.id);
  const recent = await listRecent(user.id);
  const team = await loadTeam(user.id);
  return (
    <BoardApp
      username={user.username}
      sessionToken={user.token}
      initialMarks={marks}
      initialRecent={recent}
      initialTeam={team}
    />
  );
}
