// Reads `pnpm fetch --reporter=ndjson` on stdin and prints `<percent> <detail>`
// lines whenever the percentage moves. install.sh turns them into update status.
//
//   pnpm fetch --dir "$stage" --reporter=ndjson | node scripts/update-progress.mjs
import readline from 'node:readline';

let resolved = 0;
let done = 0;
let fetched = 0;
let lastPercent = -1;

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', line => {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }
  if (event.name !== 'pnpm:progress') return;
  switch (event.status) {
    case 'resolved':
      resolved += 1;
      return;
    case 'fetched':
      fetched += 1;
      done += 1;
      break;
    case 'found_in_store':
      done += 1;
      break;
    default:
      return;
  }
  if (resolved === 0) return;
  const percent = Math.min(100, Math.floor((done / resolved) * 100));
  if (percent === lastPercent) return;
  lastPercent = percent;
  console.log(`${percent} ${done}/${resolved} packages (${fetched} downloaded)`);
});
