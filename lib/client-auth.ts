export const AUTH_STORAGE_KEY = "meal_it_user";

export type StoredUser = {
  email: string;
};

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredUser>;
    if (!parsed?.email || typeof parsed.email !== "string") return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export function setStoredUser(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      email: email.trim().toLowerCase(),
    })
  );
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
