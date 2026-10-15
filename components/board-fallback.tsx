export function BoardFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-heading text-3xl text-[#10241c]">Opening your card…</p>
      <p className="max-w-sm text-sm text-[#4d6156]">
        Pulling the squares you’ve already daubed.
      </p>
    </div>
  );
}
