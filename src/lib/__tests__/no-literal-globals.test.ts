import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../../../');

const BAD_LITERALS = [
  "'__GLOBAL__'",
  '"__GLOBAL__"',
  "'__ALL_COUNTRIES__'",
  '"__ALL_COUNTRIES__"',
  "'ALL'",
  '"ALL"',
];

function scan(dir: string, acc: string[] = []) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (
      p.includes('node_modules') ||
      p.includes('__tests__') ||
      p.includes('.next') ||
      p.includes('.vercel') ||
      p.includes('/static/') ||
      p.includes('/.output/')
    ) continue;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) scan(p, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) acc.push(p);
  }
  return acc;
}

describe('No literal global sentinels', () => {
  test('project contains no forbidden global literals', () => {
    const files = scan(ROOT);
    const offenders: string[] = [];
    for (const f of files) {
      // Allow literal declarations in the constants source of truth
      if (f.endsWith('src/lib/constants/claims.ts')) continue;
      const txt = fs.readFileSync(f, 'utf8');
      if (BAD_LITERALS.some(b => txt.includes(b))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
