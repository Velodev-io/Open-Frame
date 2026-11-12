const { spawn } = require('child_process');
const path = require('path');

const electronBinary = require('electron');
const extraArgs = process.argv.slice(2);
const args = ['.'];

if (process.platform === 'linux') {
    args.push('--no-sandbox', '--disable-gpu', '--ozone-platform=x11');
}

args.push(...extraArgs);

const env = { ...process.env };
if (process.platform === 'linux' && !env.GDK_BACKEND) {
    env.GDK_BACKEND = 'x11';
}

const child = spawn(electronBinary, args, {
    cwd: __dirname,
    stdio: 'inherit',
    env
});

child.on('close', (code) => {
    process.exit(code ?? 0);
});
