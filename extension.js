const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const PLUGIN_NAME = 'vscode-agent-plugins-example-as-vsix';
const SOURCE_DIR = __dirname;

// Matches VS Code's own install-from-source behavior (pluginInstallService.ts):
// each chat.pluginLocations key points DIRECTLY to a folder containing plugin.json.
const CONFIG_KEY = 'chat.pluginLocations';

async function pluginDir(context) {
  const dir = path.join(context.globalStorageUri.fsPath, 'agent-plugins', PLUGIN_NAME);
  await fsp.mkdir(path.dirname(dir), { recursive: true });
  return dir;
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  for (const entry of await fsp.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fsp.copyFile(s, d);
  }
}

async function setPathEnabled(location, enabled) {
  const cfg = vscode.workspace.getConfiguration();
  const current = cfg.inspect(CONFIG_KEY).userValue || {};
  const next = { ...current };
  for (const key of Object.keys(next)) {
    if (path.resolve(key) === path.resolve(location)) delete next[key];
  }
  if (enabled) next[location] = true;
  await cfg.update(CONFIG_KEY, next, vscode.ConfigurationTarget.Global);
  return next;
}

async function install(context) {
  const dest = await pluginDir(context);
  await fsp.rm(dest, { recursive: true, force: true });
  await copyDir(SOURCE_DIR, dest);
  const result = await setPathEnabled(dest, true);
  vscode.window.showInformationMessage(
    `Agent plugin "${PLUGIN_NAME}" installed to ${dest} (registered via ${CONFIG_KEY}). Reload VS Code to load it.`
  );
  return result;
}

async function uninstall(context) {
  const dest = await pluginDir(context);
  await fsp.rm(dest, { recursive: true, force: true });
  await setPathEnabled(dest, false);
  vscode.window.showInformationMessage(`Agent plugin "${PLUGIN_NAME}" uninstalled.`);
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('agentPluginInstaller.install', () => install(context)),
    vscode.commands.registerCommand('agentPluginInstaller.uninstall', () => uninstall(context))
  );
}

function deactivate() {}

module.exports = { activate, deactivate };