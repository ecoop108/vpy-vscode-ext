'use strict';

import * as vscode from 'vscode';

import { DepNodeProvider, VersionNode, MyVirtualDocumentProvider } from './versionExplorer';
import { MyCodeActionProvider } from './actions';
import { updateDiagnostics } from './diagnostics'
export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const provider = new MyVirtualDocumentProvider();
	const registration = vscode.workspace.registerTextDocumentContentProvider("vpy", provider);
	context.subscriptions.push(registration);

	const actions_provider = new MyCodeActionProvider();
	vscode.languages.registerCodeActionsProvider('python', actions_provider);

	// Samples of `window.registerTreeDataProvider`
	const versionExplorerProvider = new DepNodeProvider(rootPath, provider);
	vscode.window.registerTreeDataProvider('versionExplorer', versionExplorerProvider);
	vscode.commands.registerCommand('versionExplorer.refreshEntry', () => versionExplorerProvider.refresh());
	vscode.commands.registerCommand('versionExplorer.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('versionExplorer.editEntry', (node: VersionNode) => versionExplorerProvider.strict_slice(node.label));
	vscode.commands.registerCommand('versionExplorer.slice', (node: VersionNode) => versionExplorerProvider.slice(node.label));
	vscode.commands.registerCommand('versionExplorer.deleteEntry', (node: VersionNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	vscode.commands.registerCommand('versionExplorer.newReplace', (node: VersionNode) => versionExplorerProvider.newReplace(node.label));
	vscode.commands.registerCommand('versionExplorer.newUpgrade', (node: VersionNode) => versionExplorerProvider.newUpgrade(node.label));

	// Setup diagnostic reporting from type checker
	const collection = vscode.languages.createDiagnosticCollection('pyanalyze');
	vscode.workspace.findFiles('**/*.py').then(uris => {
		uris.forEach(uri => {
			// Read each Python file and update diagnostics
			vscode.workspace.openTextDocument(uri).then(document => {
				updateDiagnostics(document, collection);
			});
		});
	});
	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
		if (document.languageId === 'python') {
			updateDiagnostics(document, collection);
		}
	}));
}