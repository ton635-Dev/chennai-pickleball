// 端末のブラウザにメンバーIDを保存(認証なし方式・仕様書 3.1)

const KEY = "cpb.member";

export interface StoredMember {
  id: string;
  name: string;
}

export function loadMember(): StoredMember | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMember;
    if (parsed && parsed.id && parsed.name) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveMember(m: StoredMember): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(m));
}

export function clearMember(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
