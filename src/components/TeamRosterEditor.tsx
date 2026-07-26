"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { renameTournamentEntry, updateTeamRosters } from "@/app/actions";
import type { TournamentEntry } from "@/lib/types";

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];
const circle = (i: number) => CIRCLED[i] ?? `${i + 1}`;

interface Props {
  tournamentId: string;
  entries: TournamentEntry[];
  /** チームごとの勝敗表示(任意) */
  recordOf?: (entryId: string) => string | null;
  sizeMin: number;
  sizeMax: number;
}

/** 移動中のメンバー情報 */
interface Dragging {
  player: string;
  fromEntryId: string;
}

/**
 * 団体戦のチーム編集。
 * - チーム名の変更(その場で編集)
 * - メンバーの入れ替え: PCはドラッグ&ドロップ、スマホはタップ2回(選ぶ→移動先をタップ)
 */
export function TeamRosterEditor({
  tournamentId,
  entries,
  recordOf,
  sizeMin,
  sizeMax,
}: Props) {
  const router = useRouter();
  // 編集中のメンバー構成(entryId -> 名前配列)
  const [rosters, setRosters] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(entries.map((e) => [e.id, [...(e.player_names ?? [])]]))
  );
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // チーム名の編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 親から新しいデータが来たら同期(保存後のrefresh時など)
  const entriesKey = entries
    .map((e) => `${e.id}:${(e.player_names ?? []).join(",")}`)
    .join("|");
  const prevKey = useRef(entriesKey);
  useEffect(() => {
    if (prevKey.current !== entriesKey && !dirty) {
      setRosters(
        Object.fromEntries(entries.map((e) => [e.id, [...(e.player_names ?? [])]]))
      );
      prevKey.current = entriesKey;
    }
  }, [entriesKey, entries, dirty]);

  /** メンバーを別チームへ移動 */
  const movePlayer = (player: string, fromId: string, toId: string) => {
    if (fromId === toId) return;
    setRosters((prev) => {
      const next = { ...prev };
      next[fromId] = (next[fromId] ?? []).filter((p) => p !== player);
      next[toId] = [...(next[toId] ?? []), player];
      return next;
    });
    setDirty(true);
    setSaved(false);
    setError(null);
  };

  /** 2人を交換(移動先が満員のときに便利) */
  const swapPlayers = (
    a: { player: string; entryId: string },
    b: { player: string; entryId: string }
  ) => {
    if (a.entryId === b.entryId) return;
    setRosters((prev) => {
      const next = { ...prev };
      next[a.entryId] = (next[a.entryId] ?? []).map((p) =>
        p === a.player ? b.player : p
      );
      next[b.entryId] = (next[b.entryId] ?? []).map((p) =>
        p === b.player ? a.player : p
      );
      return next;
    });
    setDirty(true);
    setSaved(false);
    setError(null);
  };

  /** タップ操作: 選択中のメンバーがいれば移動/交換、いなければ選択 */
  const onPlayerTap = (player: string, entryId: string) => {
    if (!dragging) {
      setDragging({ player, fromEntryId: entryId });
      return;
    }
    if (dragging.player === player && dragging.fromEntryId === entryId) {
      setDragging(null); // 選択解除
      return;
    }
    if (dragging.fromEntryId === entryId) {
      // 同じチーム内の別メンバーをタップ → 選択を移す
      setDragging({ player, fromEntryId: entryId });
      return;
    }
    // 別チームのメンバーをタップ → 交換
    swapPlayers(
      { player: dragging.player, entryId: dragging.fromEntryId },
      { player, entryId }
    );
    setDragging(null);
  };

  /** チーム枠をタップ → 選択中メンバーをそのチームへ移動 */
  const onTeamTap = (entryId: string) => {
    if (!dragging) return;
    movePlayer(dragging.player, dragging.fromEntryId, entryId);
    setDragging(null);
  };

  const reset = () => {
    setRosters(
      Object.fromEntries(entries.map((e) => [e.id, [...(e.player_names ?? [])]]))
    );
    setDragging(null);
    setDirty(false);
    setError(null);
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateTeamRosters(
        tournamentId,
        entries.map((e) => ({ entryId: e.id, players: rosters[e.id] ?? [] }))
      );
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const saveName = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await renameTournamentEntry(id, tournamentId, editName);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "変更に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const sizeLabel =
    sizeMin === sizeMax ? `${sizeMin}人` : `${sizeMin}〜${sizeMax}人`;

  return (
    <div className="space-y-2.5">
      {/* 操作ガイド */}
      <div className="rounded-xl border-l-4 border-primary bg-[#E2F3EE] p-3 text-[11px] leading-relaxed text-primary-dark">
        <b>メンバーの入れ替え</b>
        <br />
        パソコン: メンバーを<b>ドラッグ</b>して別チームへドロップ
        <br />
        スマホ: メンバーを<b>タップ</b>して選択 →{" "}
        <b>移動先のチーム枠（または交換したい相手）</b>をタップ
      </div>

      {dragging && (
        <div className="sticky top-2 z-10 flex items-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-white shadow-lg">
          <span className="rounded-pill bg-accent px-2.5 py-1 text-[11px] font-extrabold text-navy">
            {dragging.player}
          </span>
          <span className="flex-1 text-[11px] font-bold">
            移動先のチームをタップ
          </span>
          <button
            onClick={() => setDragging(null)}
            className="shrink-0 text-[11px] font-bold text-accent"
          >
            解除
          </button>
        </div>
      )}

      {entries.map((e, i) => {
        const players = rosters[e.id] ?? [];
        const rec = recordOf?.(e.id) ?? null;
        const isOver = overId === e.id;
        const isSource = dragging?.fromEntryId === e.id;
        const countBad = players.length < sizeMin || players.length > sizeMax;
        return (
          <div
            key={e.id}
            onDragOver={(ev) => {
              ev.preventDefault();
              setOverId(e.id);
            }}
            onDragLeave={() => setOverId((v) => (v === e.id ? null : v))}
            onDrop={(ev) => {
              ev.preventDefault();
              setOverId(null);
              if (dragging) {
                movePlayer(dragging.player, dragging.fromEntryId, e.id);
                setDragging(null);
              }
            }}
            className={`card p-4 transition ${
              isOver
                ? "border-2 border-primary bg-[#F3FAF7]"
                : isSource
                  ? "border-2 border-dashed border-primary/40"
                  : ""
            }`}
          >
            {/* チーム名の行 */}
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF4F1] text-xs font-extrabold text-primary-dark">
                {circle(i)}
              </span>
              {editingId === e.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(ev) => setEditName(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && saveName(e.id)}
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => saveName(e.id)}
                    disabled={busy || !editName.trim()}
                    className="btn-pill shrink-0 bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="shrink-0 px-1 text-xs font-bold text-muted"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <b className="min-w-0 flex-1 truncate text-[15px]">{e.name}</b>
                  <button
                    onClick={() => {
                      setEditingId(e.id);
                      setEditName(e.name);
                    }}
                    className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[10px] font-bold text-ink"
                    aria-label={`${e.name}の名前を変更`}
                  >
                    改名
                  </button>
                  <span
                    className={`shrink-0 text-[11px] font-bold ${
                      countBad ? "text-red-600" : "text-muted"
                    }`}
                  >
                    {players.length}人
                  </span>
                  {rec && (
                    <span className="tabnum shrink-0 rounded-pill bg-[#EDF1EF] px-2 py-0.5 text-[11px] font-extrabold text-primary-dark">
                      {rec}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* メンバー */}
            {players.length === 0 ? (
              <button
                onClick={() => onTeamTap(e.id)}
                className="w-full rounded-xl border-2 border-dashed border-line py-3 text-center text-[11px] text-muted"
              >
                {dragging ? "ここにタップで移動" : "メンバーなし"}
              </button>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {players.map((p) => {
                  const selected =
                    dragging?.player === p && dragging?.fromEntryId === e.id;
                  return (
                    <button
                      key={p}
                      draggable
                      onDragStart={() =>
                        setDragging({ player: p, fromEntryId: e.id })
                      }
                      onDragEnd={() => {
                        setDragging(null);
                        setOverId(null);
                      }}
                      onClick={() => onPlayerTap(p, e.id)}
                      className={`flex cursor-grab items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-xs font-bold transition active:cursor-grabbing ${
                        selected
                          ? "bg-accent text-navy ring-2 ring-primary"
                          : "bg-bg text-ink"
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EDF4F1] text-[10px] font-extrabold text-primary-dark">
                        {p.trim().charAt(0) || "?"}
                      </span>
                      {p}
                      <span className="text-[10px] text-muted">⣿</span>
                    </button>
                  );
                })}
                {/* 空きスロットへのドロップ先 */}
                {dragging && dragging.fromEntryId !== e.id && (
                  <button
                    onClick={() => onTeamTap(e.id)}
                    className="rounded-pill border-2 border-dashed border-primary px-3 py-1.5 text-[11px] font-extrabold text-primary"
                  >
                    ＋ ここへ移動
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl bg-[#E2F3EE] px-3 py-2 text-sm font-bold text-primary-dark">
          メンバー構成を保存しました ✓
        </p>
      )}

      {dirty && (
        <div className="sticky bottom-2 flex gap-2">
          <button
            onClick={reset}
            disabled={busy}
            className="btn-pill flex-1 border border-line bg-surface py-3 text-sm font-bold text-muted disabled:opacity-50"
          >
            元に戻す
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="btn-pill flex-[2] bg-primary py-3 text-[15px] text-white shadow-lg disabled:opacity-50"
          >
            {busy ? "保存中…" : "この構成で保存"}
          </button>
        </div>
      )}

      <p className="text-center text-[11px] text-muted">
        1チーム{sizeLabel}。人数が合わないと保存できません。
      </p>
    </div>
  );
}
