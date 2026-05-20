const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const empty = path.resolve(projectRoot, 'src/shims/empty.js');
const wsStub = path.resolve(projectRoot, 'src/shims/ws.js');

// Redirect ws package (and its internals) + Node.js built-ins to stubs.
// @supabase/realtime-js conditionally requires 'ws' for non-browser envs,
// but React Native has global WebSocket so ws is never actually called.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws' || moduleName.startsWith('ws/')) {
    return { type: 'sourceFile', filePath: wsStub };
  }
  const nodeBuiltins = ['stream', 'zlib', 'net', 'tls', 'http', 'https',
    'url', 'crypto', 'os', 'path', 'fs', 'child_process', 'dns',
    'events', 'buffer', 'util', 'assert', 'querystring'];
  if (nodeBuiltins.includes(moduleName)) {
    return { type: 'sourceFile', filePath: empty };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
