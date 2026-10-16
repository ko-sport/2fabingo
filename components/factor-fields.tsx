import type { SignInFactor } from "@/lib/email-code";

const OPTIONS: { value: SignInFactor; label: string }[] = [
  { value: "password", label: "Password only" },
  { value: "authenticator", label: "Authenticator app" },
  { value: "email", label: "Email" },
];

export function FactorFields({ defaultValue }: { defaultValue: SignInFactor }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-[#14211b]">How you sign in</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm text-[#14211b]">
          <input
            type="radio"
            name="factor"
            value={option.value}
            defaultChecked={defaultValue === option.value}
            data-testid={`factor-${option.value}`}
            className="size-4 accent-[#1f7a45]"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
