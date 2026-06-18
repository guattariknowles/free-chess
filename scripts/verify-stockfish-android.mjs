import { spawn, execFileSync } from 'node:child_process';

import { Chess } from 'chess.js';

const serial = process.argv[2] ?? 'emulator-5554';
const packageName = process.argv[3] ?? 'com.knowles.freechess';
const searchCount = Number.parseInt(process.argv[4] ?? '100', 10);
const adb = process.env.ADB ?? 'adb';

function runAdb(args) {
  return execFileSync(adb, ['-s', serial, ...args], {
    encoding: 'utf8',
  }).trim();
}

function toUci(move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function parseBestMove(line) {
  const value = line.slice('bestmove '.length).split(/\s+/, 1)[0];
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(value);

  if (!match) {
    throw new Error(`Invalid bestmove output: ${line}`);
  }

  return {
    from: match[1],
    promotion: match[3],
    to: match[2],
    uci: value,
  };
}

if (!Number.isInteger(searchCount) || searchCount < 1) {
  throw new Error('Search count must be a positive integer');
}

const packagePaths = runAdb([
  'shell',
  'pm',
  'path',
  packageName,
]).split(/\r?\n/);
const baseApk = packagePaths
  .find((line) => line.startsWith('package:') && line.endsWith('/base.apk'))
  ?.slice('package:'.length);

if (!baseApk) {
  throw new Error(`Unable to find installed package: ${packageName}`);
}

const abi = runAdb(['shell', 'getprop', 'ro.product.cpu.abi']);
if (abi !== 'arm64-v8a' && abi !== 'x86_64') {
  throw new Error(`Unsupported device ABI: ${abi}`);
}

const installDirectory = baseApk.slice(0, -'/base.apk'.length);
const enginePath = `${installDirectory}/lib/${abi}/libstockfish.so`;
const dataDirectory = runAdb([
  'shell',
  'run-as',
  packageName,
  'pwd',
]);
const networkDirectory = `${dataDirectory}/no_backup/stockfish`;

runAdb([
  'shell',
  'run-as',
  packageName,
  'test',
  '-x',
  enginePath,
]);
runAdb([
  'shell',
  'run-as',
  packageName,
  'test',
  '-r',
  `${networkDirectory}/nn-c288c895ea92.nnue`,
]);
runAdb([
  'shell',
  'run-as',
  packageName,
  'test',
  '-r',
  `${networkDirectory}/nn-37f18f62d772.nnue`,
]);

const engine = spawn(
  adb,
  [
    '-s',
    serial,
    'shell',
    'run-as',
    packageName,
    enginePath,
  ],
  {
    stdio: ['pipe', 'pipe', 'inherit'],
  },
);

engine.stdout.setEncoding('utf8');

let buffer = '';
let queuedLines = [];
let activeWaiter = null;
let engineExit = null;

function rejectActiveWaiter(error) {
  if (activeWaiter) {
    clearTimeout(activeWaiter.timeout);
    activeWaiter.reject(error);
    activeWaiter = null;
  }
}

function receiveLine(line) {
  const normalized = line.trim();
  if (!normalized) {
    return;
  }

  if (activeWaiter?.predicate(normalized)) {
    clearTimeout(activeWaiter.timeout);
    activeWaiter.resolve(normalized);
    activeWaiter = null;
    return;
  }

  queuedLines.push(normalized);
}

engine.stdout.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() ?? '';
  lines.forEach(receiveLine);
});

engine.on('error', (error) => {
  engineExit = error;
  rejectActiveWaiter(error);
});

engine.on('exit', (code, signal) => {
  engineExit = new Error(
    `Stockfish process exited with code ${code ?? 'null'} and signal ${
      signal ?? 'null'
    }`,
  );
  rejectActiveWaiter(engineExit);
});

function send(command) {
  if (engineExit) {
    throw engineExit;
  }
  engine.stdin.write(`${command}\n`);
}

function waitFor(predicate, timeoutMs = 10_000) {
  const queuedIndex = queuedLines.findIndex(predicate);
  if (queuedIndex >= 0) {
    return Promise.resolve(queuedLines.splice(queuedIndex, 1)[0]);
  }

  if (engineExit) {
    return Promise.reject(engineExit);
  }

  if (activeWaiter) {
    return Promise.reject(new Error('Only one UCI wait may be active'));
  }

  return new Promise((resolve, reject) => {
    activeWaiter = {
      predicate,
      reject,
      resolve,
      timeout: setTimeout(() => {
        activeWaiter = null;
        reject(new Error('Timed out waiting for Stockfish output'));
      }, timeoutMs),
    };
  });
}

async function closeEngine() {
  if (!engineExit) {
    send('quit');
  }

  await new Promise((resolve) => {
    if (engineExit) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      engine.kill();
      resolve();
    }, 1_000);

    engine.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

try {
  send('uci');
  await waitFor((line) => line === 'uciok');
  send('setoption name Threads value 1');
  send('setoption name Hash value 16');
  send('setoption name Ponder value false');
  send(
    `setoption name EvalFile value ${networkDirectory}/nn-c288c895ea92.nnue`,
  );
  send(
    `setoption name EvalFileSmall value ${networkDirectory}/nn-37f18f62d772.nnue`,
  );
  send('setoption name Skill Level value 0');
  send('isready');
  await waitFor((line) => line === 'readyok', 30_000);

  const game = new Chess();

  for (let index = 0; index < searchCount; index += 1) {
    if (game.isGameOver()) {
      game.reset();
    }

    const legalMoves = game.moves({ verbose: true });
    const constrainedMove =
      index % 10 === 0
        ? legalMoves[index % legalMoves.length]
        : null;
    const searchMoves = constrainedMove
      ? ` searchmoves ${toUci(constrainedMove)}`
      : '';

    send(`position fen ${game.fen()}`);
    send(`go movetime 50${searchMoves}`);

    const bestMoveLine = await waitFor(
      (line) => line.startsWith('bestmove '),
    );
    const bestMove = parseBestMove(bestMoveLine);

    if (constrainedMove && bestMove.uci !== toUci(constrainedMove)) {
      throw new Error(
        `searchmoves returned ${bestMove.uci}, expected ${toUci(
          constrainedMove,
        )}`,
      );
    }

    let appliedMove;
    try {
      appliedMove = game.move({
        from: bestMove.from,
        promotion: bestMove.promotion,
        to: bestMove.to,
      });
    } catch {
      appliedMove = null;
    }

    if (!appliedMove) {
      throw new Error(
        `Stockfish returned illegal move ${bestMove.uci} for ${game.fen()}`,
      );
    }

    process.stdout.write(
      `\rVerified ${index + 1}/${searchCount} positions`,
    );
  }

  process.stdout.write('\n');
  console.log(
    `Stockfish Android verification passed on ${serial} (${abi}).`,
  );
} finally {
  await closeEngine();
}
