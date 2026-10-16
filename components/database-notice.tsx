import Link from "next/link";
import { databaseMessage } from "@/lib/db";
import { Wordmark } from "@/components/wordmark";

export function DatabaseNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <Link href="/" className="text-2xl text-[#14211b]">
        <Wordmark />
      </Link>
      <div className="ticket mt-8 rounded-2xl p-6" data-testid="database-notice">
        <h1 className="font-heading text-4xl text-[#14211b]">The card has no database yet</h1>
        <p className="mt-3 text-sm leading-6 text-[#4d6156]">{message}</p>
      </div>
    </div>
  );
}

export async function blockedDatabase() {
  const message = await databaseMessage();
  if (!message) return null;
  return <DatabaseNotice message={message} />;
}
