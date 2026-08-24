export function hasPasswordRecoveryMarker(url: string) {
  try {
    const parsed = new URL(url);
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    return (
      parsed.searchParams.get("type") === "recovery" ||
      hash.get("type") === "recovery"
    );
  } catch {
    return false;
  }
}

export function passwordRecoveryRedirect(origin: string) {
  return `${origin.replace(/\/$/, "")}/reset-password`;
}
