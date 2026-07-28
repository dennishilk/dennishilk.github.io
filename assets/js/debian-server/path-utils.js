export const HOME = '/home/visitor';

export function normalizePath(input, cwd = HOME) {
  let value = input === '~' || input.startsWith('~/') ? HOME + input.slice(1) : input;
  if (!value.startsWith('/')) value = `${cwd}/${value}`;
  const parts = [];
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop(); else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

export function parentPath(path) {
  const parts = normalizePath(path).split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
}

export function baseName(path) {
  return normalizePath(path).split('/').filter(Boolean).pop() || '/';
}

export function promptPath(path) {
  return path === HOME ? '~' : path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path;
}
