"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearMember,
  loadMember,
  saveMember,
  type StoredMember,
} from "@/lib/member-store";
import { verifyMember } from "@/app/actions";

interface MemberContextValue {
  member: StoredMember | null;
  loaded: boolean;
  setMember: (m: StoredMember) => void;
  signOut: () => void;
}

const MemberContext = createContext<MemberContextValue | null>(null);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [member, setMemberState] = useState<StoredMember | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = loadMember();
    setMemberState(stored);
    setLoaded(true);
    // 保存済みIDがDBに存在するか検証(別端末で削除された場合などに対応)
    if (stored) {
      verifyMember(stored.id)
        .then((m) => {
          if (!m) {
            // 削除済み: ひも付けを解除して再登録を促す
            clearMember();
            setMemberState(null);
          } else if (m.name !== stored.name) {
            // 別端末で改名された場合は同期
            saveMember(m);
            setMemberState(m);
          }
        })
        .catch(() => {
          /* 検証失敗(オフライン等)はそのまま利用 */
        });
    }
  }, []);

  const setMember = useCallback((m: StoredMember) => {
    saveMember(m);
    setMemberState(m);
  }, []);

  const signOut = useCallback(() => {
    clearMember();
    setMemberState(null);
  }, []);

  return (
    <MemberContext.Provider value={{ member, loaded, setMember, signOut }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember は MemberProvider の中で使ってください");
  return ctx;
}
