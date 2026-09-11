const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const EXT_ID = 'dealenx.vscode-agent-plugins-example-as-vsix';
const PLUGIN_NAME = 'vscode-agent-plugins-example-as-vsix';
// Only files relevant to the agent plugin are mirrored into globalStorage.
const PLUGIN_FILES = ['plugin.json', 'README.md', 'LICENSE', 'skills'];
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

// Mirror only plugin-relevant files into globalStorage.
async function copyPluginFilesInto(src, dest) {
  await fsp.rm(dest, { recursive: true, force: true });
  await fsp.mkdir(dest, { recursive: true });
  for (const name of PLUGIN_FILES) {
    const s = path.join(src, name);
    const st = await fsp.stat(s).catch(() => null);
    if (!st) continue;
    if (st.isDirectory()) await copyDir(s, path.join(dest, name));
    else await fsp.copyFile(s, path.join(dest, name));
  }
}

async function copyPluginFiles(context) {
  const dest = await pluginDir(context);
  await copyPluginFilesInto(SOURCE_DIR, dest);
  return dest;
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

// Install: copy plugin files + register path. Called on VSIX install (activate)
// and manually via command.
async function install(context) {
  const dest = await copyPluginFiles(context);
  await setPathEnabled(dest, true);
  vscode.window.showInformationMessage(
    `Agent plugin "${PLUGIN_NAME}" installed to ${dest} (registered via ${CONFIG_KEY}).`
  );
  return dest;
}

// Uninstall: remove plugin files + deregister path.
async function uninstall(context) {
  const dest = await pluginDir(context);
  await fsp.rm(dest, { recursive: true, force: true });
  await setPathEnabled(dest, false);
  vscode.window.showInformationMessage(`Agent plugin "${PLUGIN_NAME}" uninstalled.`);
}

// VSIX was removed while the host was still running: extensions.onDidChange
// fires and our own extension id disappears from vscode.extensions.all.
function watchSelfUninstall(context) {
  const handler = () => {
    if (!vscode.extensions.getExtension(EXT_ID)) {
      // Extension is gone — clean up agent plugin best-effort, no UI (we're
      // racing extension teardown).
      uninstall(context).catch(() => {});
    }
  };
  const sub = vscode.extensions.onDidChange(handler);
  context.subscriptions.push(sub);
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('agentPluginInstaller.install', () => install(context)),
    vscode.commands.registerCommand('agentPluginInstaller.uninstall', () => uninstall(context))
  );
  if (context.extensionMode !== vscode.ExtensionMode.Production) return;

  // VSIX just installed / updated (or VS Code restarted with it present):
  // mirror installation into Agent Plugins.
  install(context).catch((e) =>
    vscode.window.showErrorMessage(`Agent plugin auto-install failed: ${e.message}`)
  );

  watchSelfUninstall(context);
}

function deactivate() {}

module.exports = { activate, deactivate };