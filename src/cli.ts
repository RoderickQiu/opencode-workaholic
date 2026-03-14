#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const OPENCODE_CONFIG_PATH = join(homedir(), '.config/opencode/opencode.json');

interface OpenCodeConfig {
  $schema?: string;
  plugin?: string[];
  [key: string]: unknown;
}

function getConfig(): OpenCodeConfig {
  if (!existsSync(OPENCODE_CONFIG_PATH)) {
    return { plugin: [] };
  }
  try {
    const content = readFileSync(OPENCODE_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { plugin: [] };
  }
}

function saveConfig(config: OpenCodeConfig) {
  writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function addPlugin(pluginName: string) {
  const config = getConfig();
  
  if (!config.plugin) {
    config.plugin = [];
  }
  
  if (!config.plugin.includes(pluginName)) {
    config.plugin.push(pluginName);
    saveConfig(config);
    console.log(`✅ Added "${pluginName}" to plugins`);
  } else {
    console.log(`ℹ️  "${pluginName}" is already in plugins`);
  }
}

function removePlugin(pluginName: string) {
  const config = getConfig();
  
  if (config.plugin && config.plugin.includes(pluginName)) {
    config.plugin = config.plugin.filter(p => p !== pluginName);
    saveConfig(config);
    console.log(`✅ Removed "${pluginName}" from plugins`);
  } else {
    console.log(`ℹ️  "${pluginName}" is not in plugins`);
  }
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'install':
    addPlugin('opencode-workaholic');
    console.log('\n📌 Next steps:');
    console.log('   1. Restart OpenCode');
    console.log('   2. Run: opencode -c');
    console.log('   3. Verify: workaholic.start, workaholic.status, workaholic.stop');
    break;
    
  case 'uninstall':
    removePlugin('opencode-workaholic');
    console.log('\n📌 Restart OpenCode to apply changes');
    break;
    
  default:
    console.log(`
opencode-workaholic CLI

Usage:
  opencode-workaholic install    Add plugin to OpenCode config
  opencode-workaholic uninstall  Remove plugin from OpenCode config

Or use directly:
  bunx opencode-workaholic@latest install
`);
}
