import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2];
const extra = process.argv.slice(3);
const commands = new Set(['dev', 'build', 'preview', 'check', 'setup']);

function execute(file, args) {
  const result = spawnSync(process.execPath, [file, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    windowsHide: false,
  });
  if (result.error) throw new Error(`Nao foi possivel executar ${file}: ${result.error.message}`);
  return result.status ?? (result.signal === 'SIGINT' ? 130 : 1);
}

function ensureDependencies() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (!((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22)) {
    throw new Error(`Node.js ${process.versions.node} incompativel. Use Node.js 22.12 ou superior, ou Node.js 20.19+ da linha 20.`);
  }
  const fingerprint = createHash('sha256')
    .update(readFileSync(resolve(root, 'package.json')))
    .update(readFileSync(resolve(root, 'package-lock.json')))
    .update(`${process.platform}:${process.arch}:node${major}`)
    .digest('hex');
  const marker = resolve(root, 'node_modules/.concierge-install.json');
  const required = ['vite/bin/vite.js', 'typescript/bin/tsc', 'react/package.json', '@tanstack/react-start/package.json'];
  let installed = false;
  try {
    installed = JSON.parse(readFileSync(marker, 'utf8')).fingerprint === fingerprint
      && required.every(file => existsSync(resolve(root, 'node_modules', file)));
  } catch {
    // A new extraction has no installation marker; prepare dependencies before running.
  }
  if (installed) {
    console.log('Dependencias locais conferidas.');
    return;
  }
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) {
    throw new Error('Execute este projeto por npm run dev, npm run build ou npm run setup.');
  }
  console.log('Preparando dependencias locais da V3. A primeira instalacao precisa de internet.');
  // npm ci installs the exact lockfile. include=dev also installs Vite when npm omits devDependencies.
  const code = execute(npmCli, ['ci', '--include=dev', '--no-audit', '--no-fund']);
  if (code !== 0) throw new Error('A instalacao de dependencias falhou. O app nao foi iniciado. Confira a mensagem do npm acima.');
  if (!required.every(file => existsSync(resolve(root, 'node_modules', file)))) {
    throw new Error('A instalacao terminou sem todos os arquivos necessarios. Confira as mensagens do npm.');
  }
  writeFileSync(marker, JSON.stringify({ fingerprint, platform: process.platform, arch: process.arch, node: process.versions.node }, null, 2) + '\n');
  console.log('Dependencias preparadas com sucesso.');
}

try {
  if (!commands.has(mode)) throw new Error('Comando invalido. Use npm run dev, build, preview, check ou setup.');
  ensureDependencies();
  if (mode === 'setup') {
    process.exitCode = 0;
  } else if (mode === 'check') {
    process.exitCode = execute(resolve(root, 'node_modules/typescript/bin/tsc'), ['--noEmit', ...extra]);
  } else {
    // Direct Node entrypoint: does not depend on a global Vite or node_modules/.bin/vite.cmd.
    process.exitCode = execute(resolve(root, 'node_modules/vite/bin/vite.js'), [mode, ...extra]);
  }
} catch (error) {
  console.error(`\nConcierge Assessment: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
