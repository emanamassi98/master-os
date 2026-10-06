import { readFile, writeFile } from 'node:fs/promises';
const candidates = JSON.parse(await readFile('.monitor-notifications.json', 'utf8'));
const historyPath = 'notification-history.json';
let history;
try { history = JSON.parse(await readFile(historyPath, 'utf8')); } catch { history = []; }
const known = new Set(history);
const fresh = candidates.filter(e => !known.has(e.id));
if (fresh.length) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !token) throw new Error('Run this step in GitHub Actions with the repository token.');
  // Provider text is untrusted content. It is sent as JSON, never shell code.
  const plain = value => String(value).replace(/[<>`\[\]]/g, '').replace(/@/g, '＠');
  const marker = '<!-- masters-os-events:' + fresh.map(e => e.id).sort().join(',') + ' -->';
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const api = `https://api.github.com/repos/${repository}/issues`;
  // Recover safely if an earlier run created the issue but failed to persist history.
  let exists = false;
  for (let page = 1; page <= 5; page++) {
    const lookup = await fetch(`${api}?state=all&sort=created&direction=desc&per_page=100&page=${page}`, { headers });
    if (!lookup.ok) throw new Error(`Cannot verify existing alerts (HTTP ${lookup.status}).`);
    const issues = await lookup.json();
    if (issues.some(issue => issue.body?.includes(marker))) { exists = true; break; }
    if (issues.length < 100) break;
  }
  if (!exists) {
    const title = `Masters OS: ${fresh.length} new 2027/28 update${fresh.length === 1 ? '' : 's'} to review`;
    const body = 'These are automated review signals, not verified open offers. Confirm the new-year dates, master’s coverage, residence and immigration requirements before applying.\n\n' + fresh.map(e => `### ${plain(e.title)}\n${plain(e.summary)}\n\nSource: ${e.url}\nDetected: ${e.detectedAt}`).join('\n\n') + '\n\n' + marker;
    const response = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ title, body }) });
    if (!response.ok) throw new Error(`GitHub could not create the alert issue (HTTP ${response.status}). Enable Issues and check workflow permissions.`);
    console.log('Created a repository issue for new-year updates.');
  }
  await writeFile(historyPath, JSON.stringify([...history, ...fresh.map(e => e.id)].slice(-3000), null, 2) + '\n');
} else console.log('No unnotified signals.');
