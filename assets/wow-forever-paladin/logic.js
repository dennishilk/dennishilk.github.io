// Pure shared rules. No DOM, storage, network or framework dependency.
export const emptyBuild = data => data.trees.map(tree => tree.talents.map(() => 0));
export const cloneBuild = build => build.map(tree => [...tree]);
export const totals = build => build.map(tree => tree.reduce((a, b) => a + b, 0));
export const spent = build => totals(build).reduce((a, b) => a + b, 0);
export const requiredLevel = build => Math.max(10, spent(build) + 9);
export function validBuild(data, build) {
  if (!Array.isArray(build) || build.length !== data.trees.length) return false;
  let total = 0;
  for (let ti = 0; ti < data.trees.length; ti++) {
    const talents = data.trees[ti].talents, ranks = build[ti];
    if (!Array.isArray(ranks) || ranks.length !== talents.length) return false;
    for (let i = 0; i < talents.length; i++) {
      const talent = talents[i], rank = ranks[i];
      if (!Number.isInteger(rank) || rank < 0 || rank > talent.max) return false;
      total += rank;
      if (!rank) continue;
      const earlier = talents.reduce((n, t, j) => n + (t.row < talent.row ? ranks[j] : 0), 0);
      if (earlier < (talent.row - 1) * 5) return false;
      if (talent.req) {
        const parent = talents.findIndex(t => t.id === talent.req.id);
        if (parent < 0 || ranks[parent] < talent.req.rank) return false;
      }
    }
  }
  return total <= 51;
}
export function changeRank(data, build, tree, index, delta) {
  if (![1, -1].includes(delta) || !data.trees[tree]?.talents[index]) return null;
  const next = cloneBuild(build);
  next[tree][index] += delta;
  return validBuild(data, next) ? next : null;
}
export function resetTree(data, build, tree) {
  const next = cloneBuild(build);
  next[tree] = data.trees[tree].talents.map(() => 0);
  return next;
}
export function encodeBuild(data, build) {
  if (!validBuild(data, build)) throw new Error('Invalid build');
  return data.version + '.' + build.map(tree => tree.join('')).join('.');
}
export function decodeBuild(data, code) {
  if (typeof code !== 'string' || code.length > 100 || !/^p1\.[0-5]+\.[0-5]+\.[0-5]+$/.test(code)) return null;
  const [version, ...parts] = code.split('.');
  if (version !== data.version) return null;
  const build = parts.map(tree => [...tree].map(Number));
  return validBuild(data, build) ? build : null;
}
