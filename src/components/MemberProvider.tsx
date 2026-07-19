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
    setMemberState(loadMember());
    setLoaded(true);
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
