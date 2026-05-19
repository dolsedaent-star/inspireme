const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// EAS 빌드 서버에서 워크스페이스 패키지가 없을 때를 대비해 직접 경로 지정
config.resolver.extraNodeModules = {
  '@inspireme/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
};

module.exports = config;
