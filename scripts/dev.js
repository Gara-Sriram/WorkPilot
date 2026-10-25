import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('========================================================');
console.log('  Starting WorkPilot (Server + Client Dev Environment)  ');
console.log('========================================================\n');

// Start Backend Server
const serverProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(ROOT_DIR, 'server'),
  stdio: 'inherit',
  shell: true,
});

// Start Frontend Client
const clientProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(ROOT_DIR, 'client'),
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\n[WorkPilot] Stopping processes...');
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
