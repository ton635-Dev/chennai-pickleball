// 大会の組み合わせ生成・順位計算(純粋関数・テスト可能)

export interface GeneratedMatch {
  round: number;
  position: number;
  entry1_id: string | null;
  entry2_id: string | null;
  winner_entry_id: string | null;
  status: "pending" | "done";
}

/** 標準シード順(スロット順に seed番号 1..n を返す)。n は2のべき乗。 */
export function seedOrder(n: number): number[] {
  let pls = [1, 2];
  const rounds = Math.log2(n);
  for (let r = 1; r < rounds; r++) {
    const sum = pls.length * 2 + 1;
    const out: number[] = [];
    for (const p of pls) {
      out.push(p);
      out.push(sum - p);
    }
    pls = out;
  }
  return pls;
}

function nextPow2(n: number): number {
  let b = 1;
  while (b < n) b *= 2;
  return b;
}

/** ラウンド総数(1回戦〜決勝) */
export function totalRounds(entryCount: number): number {
  return Math.max(1, Math.log2(nextPow2(Math.max(2, entryCount))));
}

/** ラウンド名(例: 決勝/準決勝/準々決勝/1回戦) */
export function roundName(round: number, total: number): string {
  const remaining = total - round;
  if (remaining === 0) return "決勝";
  if (remaining === 1) return "準決勝";
  if (remaining === 2) return "準々決勝";
  return `${round}回戦`;
}

/**
 * シングルエリミネーションの全試合を生成。
 * entryIds はシード順(強い順)で渡す。BYEは自動配置。
 */
export function generateSingleElim(entryIds: string[]): GeneratedMatch[] {
  const n = entryIds.length;
  if (n < 2) return [];
  const B = nextPow2(n);
  const order = seedOrder(B);
  // スロット→エントリー(seed番号がnを超えたらBYE=null)
  const slots: (string | null)[] = order.map((seed) =>
    seed <= n ? entryIds[seed - 1] : null
  );
  const R = Math.log2(B);

  // (round,position)→match の器を用意
  const map = new Map<string, GeneratedMatch>();
  const key = (r: number, p: number) => `${r}:${p}`;
  for (let r = 1; r <= R; r++) {
    const count = B / Math.pow(2, r);
    for (let p = 0; p < count; p++) {
      map.set(key(r, p), {
        round: r,
        position: p,
        entry1_id: null,
        entry2_id: null,
        winner_entry_id: null,
        status: "pending",
      });
    }
  }

  // 1回戦にエントリーを配置
  const firstCount = B / 2;
  for (let p = 0; p < firstCount; p++) {
    const m = map.get(key(1, p))!;
    m.entry1_id = slots[2 * p];
    m.entry2_id = slots[2 * p + 1];
  }

  // 勝者を次ラウンドへ進める(BYEは即確定)
  const advance = (r: number, p: number, winner: string) => {
    if (r >= R) return;
    const nm = map.get(key(r + 1, Math.floor(p / 2)))!;
    if (p % 2 === 0) nm.entry1_id = winner;
    else nm.entry2_id = winner;
  };

  // BYE解決(ラウンド順に。BYE勝者が次戦でまたBYEになることは通常ないが順に処理)
  for (let r = 1; r <= R; r++) {
    const count = B / Math.pow(2, r);
    for (let p = 0; p < count; p++) {
      const m = map.get(key(r, p))!;
      if (m.status === "done") continue;
      const a = m.entry1_id;
      const b = m.entry2_id;
      // 片方だけ存在 = 不戦勝
      if (a && !b) {
        m.winner_entry_id = a;
        m.status = "done";
        advance(r, p, a);
      } else if (!a && b) {
        m.winner_entry_id = b;
        m.status = "done";
        advance(r, p, b);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * 総当たり(リーグ)の全試合を生成(サークル法)。
 * round=試合日(0始まり), position=その日の順序。
 */
export function generateRoundRobin(entryIds: string[]): GeneratedMatch[] {
  const arr: (string | null)[] = [...entryIds];
  if (arr.length < 2) return [];
  if (arr.length % 2 === 1) arr.push(null); // BYE枠
  const nn = arr.length;
  const rounds = nn - 1;
  const half = nn / 2;
  let list = arr.slice();
  const matches: GeneratedMatch[] = [];
  for (let r = 0; r < rounds; r++) {
    let pos = 0;
    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[nn - 1 - i];
      if (a !== null && b !== null) {
        matches.push({
          round: r,
          position: pos++,
          entry1_id: a,
          entry2_id: b,
          winner_entry_id: null,
          status: "pending",
        });
      }
    }
    // 先頭固定で回転
    list = [list[0], list[nn - 1], ...list.slice(1, nn - 1)];
  }
  return matches;
}

// ---------------------------------------------------------------------
// 順位表(リーグ)
// ---------------------------------------------------------------------
export interface StandingRow {
  entryId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  played: number;
}

interface MatchResult {
  entry1_id: string | null;
  entry2_id: string | null;
  score1: number | null;
  score2: number | null;
  winner_entry_id: string | null;
  status: string;
}

export function computeStandings(
  entryIds: string[],
  matches: MatchResult[]
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of entryIds) {
    rows.set(id, {
      entryId: id,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      played: 0,
    });
  }
  for (const m of matches) {
    if (m.status !== "done" || !m.entry1_id || !m.entry2_id) continue;
    const r1 = rows.get(m.entry1_id);
    const r2 = rows.get(m.entry2_id);
    if (!r1 || !r2) continue;
    const s1 = m.score1 ?? 0;
    const s2 = m.score2 ?? 0;
    r1.pointsFor += s1;
    r1.pointsAgainst += s2;
    r2.pointsFor += s2;
    r2.pointsAgainst += s1;
    r1.played += 1;
    r2.played += 1;
    if (m.winner_entry_id === m.entry1_id) {
      r1.wins += 1;
      r2.losses += 1;
    } else if (m.winner_entry_id === m.entry2_id) {
      r2.wins += 1;
      r1.losses += 1;
    }
  }
  return Array.from(rows.values())
    .map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pointsFor - a.pointsFor);
}
