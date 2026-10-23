const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// This repository has separate npm/pnpm projects, not package-manager workspaces.
// Make the dependency-free civil calendar shared with the website visible to Metro.
config.watchFolders = [...new Set([...config.watchFolders, path.resolve(__dirname, '../shared')])];
module.exports = config;
