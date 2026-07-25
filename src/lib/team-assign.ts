// 団体戦のチーム自動振り分け(純粋関数)
// - 1チーム3〜4人になるチーム数のみ許可
// - 「分散」指定メンバーはなるべく別チームへ(チーム数より多い場合も均等に散らす)

/**
 * 1チーム min〜max 人で成立するチーム数の候補(2チーム以上)。
 * 既定は 3〜4人(従来の挙動)。
 */
export function validTeamCounts(n: number, min = 3, max = 4): number[] {
  const lo = Math.max(1, min);
  const hi = Math.max(lo, max);
  const out: number[] = [];
  for (let t = Math.max(2, Math.ceil(n / hi)); t <= Math.floor(n / lo); t++) {
    out.push(t);
  }
  return out;
}

/** 各チームの人数(先頭から余りを配る。例: 10人3チーム → 4,3,3) */
export function teamSizes(n: number, t: number): number[] {
  const base = Math.floor(n / t);
  const r = n % t;
  return Array.from({ length: t }, (_, i) => base + (i < r ? 1 : 0));
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * pool を teamCount チームにランダム振り分け。
 * spread のメンバーは別チームに分かれるよう先に1人ずつ配る。
 */
export function assignTeams(
  pool: string[],
  spread: string[],
  teamCount: number,
  rand: () => number = Math.random
): string[][] {
  const sizes = teamSizes(pool.length, teamCount);
  const teams: string[][] = sizes.map(() => []);
  const spreadSet = new Set(spread.filter((s) => pool.includes(s)));
  const spreadList = shuffle([...spreadSet], rand);
  const rest = shuffle(
    pool.filter((p) => !spreadSet.has(p)),
    rand
  );

  // 分散メンバー: シャッフルしたチーム順に round-robin で配置(容量超過はスキップ)
  const order = shuffle(
    sizes.map((_, i) => i),
    rand
  );
  let k = 0;
  for (const s of spreadList) {
    let placed = false;
    for (let tries = 0; tries < teamCount; tries++) {
      const ti = order[k % teamCount];
      k++;
      if (teams[ti].length < sizes[ti]) {
        teams[ti].push(s);
        placed = true;
        break;
      }
    }
    if (!placed) rest.push(s); // 理論上到達しない(サイズ合計=人数)
  }

  // 残りを空きのあるチームへ順に充填(rest はシャッフル済みなのでランダム)
  for (const p of rest) {
    const ti = teams.findIndex((tm, i) => tm.length < sizes[i]);
    teams[ti].push(p);
  }
  return teams;
}
