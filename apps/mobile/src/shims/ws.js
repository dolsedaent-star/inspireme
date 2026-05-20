// Stub for 'ws' — React Native uses its own global WebSocket, so ws is never needed
module.exports = typeof WebSocket !== 'undefined' ? WebSocket : null;
