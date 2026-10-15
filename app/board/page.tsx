import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listMarks, listRecent, todaysFreebie } from "@/lib/marks-data";
import { BoardApp } from "@/components/board-app";
import { BoardFallback } from "@/components/board-fallback";

export default function BoardPage() {
  return (
    <Suspense fallback={<BoardFallback />}>
      <BoardGate />
    </Suspense>
  );
}

async function BoardGate() {
  const user = await getCurrentUser();
  const marks = listMarks(user.id);
  const recent = listRecent(user.id);
  return (
    <BoardApp
      username={user.username}
      sessionToken={user.token}
      freebieCode={todaysFreebie(user.id)}
      initialMarks={marks}
      initialRecent={recent}
    />
  );
}
