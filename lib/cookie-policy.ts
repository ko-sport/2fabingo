function hostName(value: string): string {
  const first = value.split(",")[0]?.trim() ?? "";
  if (first.startsWith("[")) {
    const end = first.indexOf("]");
    return (end === -1 ? first : first.slice(1, end)).toLowerCase();
  }
  return first.split(":")[0].toLowerCase();
}

function isLocalHost(name: string): boolean {
  return name === "" || name === "localhost" || name === "127.0.0.1" || name === "::1";
}

/** Embedded previews often GET without an Origin. Partition whenever the request is not local HTTP. */
export function needsPartitionedCookies(input: {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  origin?: string | null;
}): boolean {
  const forwardedHost = hostName(input.forwardedHost ?? "");
  const host = hostName(input.host ?? "");
  const forwardedProto = (input.forwardedProto ?? "").split(",")[0]?.trim();
  const origin = input.origin ?? "";
  return (
    (forwardedHost !== "" && !isLocalHost(forwardedHost)) ||
    !isLocalHost(host) ||
    forwardedProto === "https" ||
    origin.startsWith("https://")
  );
}
