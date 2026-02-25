const { execSync } = require('child_process');

if (process.env.SKIP_IDLE_WIRE_BUILD === '1') {
  console.log('[postinstall] SKIP_IDLE_WIRE_BUILD=1, skipping @northglass/idle-wire build');
  process.exit(0);
}

execSync('yarn workspace @northglass/idle-wire build', {
  stdio: 'inherit',
});
