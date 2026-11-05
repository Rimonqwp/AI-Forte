// Existing song-detail statistics are illustrative until event aggregation is connected.
const demoPracticeTotal = 1_286_000;

export function songPracticeStats(song) {
  const real = Number.isSafeInteger(song.totalPracticeCount) && song.totalPracticeCount >= 0;
  return { total: real ? song.totalPracticeCount : demoPracticeTotal, demo: !real };
}

export function formatPracticeTotal(total) {
  return total >= 10000
    ? `${Number((total / 10000).toFixed(1))}万`
    : total.toLocaleString('zh-CN');
}
