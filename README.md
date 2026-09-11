# Agent Plugins Example — as VSIX

The [agent-plugins-example](https://github.com/agentplugins/agent-plugins-example) Agent Plugin packaged two ways in one repo:

1. **VS Code extension (VSIX)** — adds two commands that install/uninstall the bundled plugin into VS Code Agent Plugins (experimental, `chat.pluginLocations`):
   - `Agent Plugin: Install vscode-agent-plugins-example-as-vsix`
   - `Agent Plugin: Uninstall vscode-agent-plugins-example-as-vsix`
2. **Agent Plugin** — root `plugin.json` (Agent Plugins v1 schema) + `skills/`, so the repo itself can be installed via *Install from Source* (`dealenx/vscode-agent-plugins-example-as-vsix`) or a local folder clone.

## Layout

```text
├── plugin.json    # Agent Plugins v1 manifest
├── package.json   # VS Code extension manifest
├── extension.js   # install/uninstall commands
└── skills/migrate-agent-plugin/
```

## Install

- **VSIX**: build with `npx @vscode/vsce package --no-dependencies`, install from the Extensions view.
- **Agent Plugin**: Extensions view → `@agentPlugins` → Install from Source → `dealenx/vscode-agent-plugins-example-as-vsix`.

Requires VS Code 1.110+ with Agent Plugins enabled (`chat.plugins.enabled`).

Reference: [Agent Plugins Specification](https://agent-plugins.org/) · [VS Code plugin architecture](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/common/plugins/AGENTS_PLUGINS.md)