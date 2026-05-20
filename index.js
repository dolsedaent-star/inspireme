// Monorepo entry redirect — Gradle/Metro looks for ./index.js at the repo
// root in some build paths. Forward to the real apps/mobile entry.
require('./apps/mobile/index.js');
