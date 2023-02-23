import * as vscode from 'vscode';

const path = vscode.Uri.parse("vscode-userdata:/User/settings.json");

export function getSettings() {
  return vscode.workspace.fs.readFile(path);
}

export function writeSettings(context: Uint8Array) {
  return vscode.workspace.fs.writeFile(path, context);
}