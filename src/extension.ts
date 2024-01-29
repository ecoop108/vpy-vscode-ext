'use strict';

import * as vscode from 'vscode';

import { DepNodeProvider, VersionNode, MyVirtualDocumentProvider } from './nodeDependencies';

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const provider = new MyVirtualDocumentProvider();
	const registration = vscode.workspace.registerTextDocumentContentProvider("vpy", provider);
	context.subscriptions.push(registration);


	// Samples of `window.registerTreeDataProvider`
	const nodeDependenciesProvider = new DepNodeProvider(rootPath, provider);
	vscode.window.registerTreeDataProvider('nodeDependencies', nodeDependenciesProvider);
	vscode.commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());
	vscode.commands.registerCommand('nodeDependencies.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('nodeDependencies.editEntry', (node: VersionNode) => nodeDependenciesProvider.strict_slice(node.label));
	vscode.commands.registerCommand('nodeDependencies.slice', (node: VersionNode) => nodeDependenciesProvider.slice(node.label));
	vscode.commands.registerCommand('nodeDependencies.deleteEntry', (node: VersionNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	vscode.commands.registerCommand('nodeDependencies.newReplace', (node: VersionNode) => nodeDependenciesProvider.newReplace(node.label));
	vscode.commands.registerCommand('nodeDependencies.newUpgrade', (node: VersionNode) => nodeDependenciesProvider.newUpgrade(node.label));


}