import Link from "next/link";
import { getOptionalUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

export async function AuthNav({ prominent = false }: { prominent?: boolean }) {
  const user = await getOptionalUser();
  if (user) {
    return (
      <Link
        href="/board"
        className={buttonVariants({
          size: prominent ? "lg" : "default",
          className: prominent ? "h-11 px-5" : undefined,
        })}
      >
        Open your card
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/register"
        className={buttonVariants({
          size: prominent ? "lg" : "default",
          className: prominent ? "h-11 px-5" : undefined,
        })}
      >
        Start a card
      </Link>
      <Link
        href="/login"
        className={buttonVariants({
          variant: "outline",
          size: prominent ? "lg" : "default",
          className: prominent
            ? "h-11 border-[#d9cbb3]/30 bg-transparent px-5 text-[#f4efe4] hover:bg-[#2a241c] hover:text-[#f4efe4]"
            : "border-[#d9cbb3]/30 bg-transparent text-[#f4efe4] hover:bg-[#2a241c] hover:text-[#f4efe4]",
        })}
      >
        Log in
      </Link>
    </div>
  );
}
