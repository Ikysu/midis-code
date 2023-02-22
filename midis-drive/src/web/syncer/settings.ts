import * as vscode from 'vscode';
export function getSettings() {
  const path = vscode.Uri.parse("vscode-userdata:/User/settings.json");
  return vscode.workspace.fs.readFile(path);
}