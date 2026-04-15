export const CHEF_ANONYMOUS_KEY_HEADER = "x-chef-anonymous-key";

export function getAnonymousKeyFromRequest(req: Request): string | null {
  const header = req.headers.get(CHEF_ANONYMOUS_KEY_HEADER);
  if (header && header.trim().length > 0) return header.trim();
  return null;
}
