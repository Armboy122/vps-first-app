import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsx = (type, props, key) => ({ type, props: props || {}, key });

function descendants(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}

test('request-list chrome includes a Thai synthetic-data notice and hides it on login', () => {
  let pathname = '/power-outage-requests';
  function SyntheticDataBanner() { return jsx('aside', { role: 'status', children: 'โหมดพรีวิวสำหรับทดสอบ • ใช้ข้อมูลจำลองที่แยกจากระบบจริง' }); }
  const load = createTypescriptLoader(root, {
    react: { useMemo: (fn) => fn() },
    'next/navigation': { usePathname: () => pathname },
    '@/components/Navbar': { default: () => jsx('nav', {}) },
    '@/components/dev/SyntheticDataBanner': { SyntheticDataBanner },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  });
  const { default: AppShell } = load('components/AppShell.tsx');
  const main = () => descendants(AppShell({ children: jsx('section', { children: 'request page' }) }));
  assert.ok(main().some((node) => node.type === SyntheticDataBanner));
  pathname = '/login';
  assert.equal(main().some((node) => node.type === SyntheticDataBanner), false);
});

test('preview request list cannot invoke the production Apps Script PDF component', () => {
  const source = fs.readFileSync(path.join(root, 'components/PowerOutageRequest/BulkActions.tsx'), 'utf8');
  assert.doesNotMatch(source, /from ["']\.\.\/print["']/);
  assert.match(source, /ปิดการสร้าง PDF ระบบจริงในพรีวิว/);
});
