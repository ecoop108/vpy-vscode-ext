import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

const CMD = "vpy"

export class MyVirtualDocumentProvider implements vscode.TextDocumentContentProvider {
	readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this.onDidChangeEmitter.event;

	// Implement the provideTextDocumentContent method to generate the content of the virtual document
	async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken) {
		const params = new URLSearchParams(uri.query);
		const strict = params.get('strict');
		const version = params.get('v');
		const file = uri.path;
		const result = await runShellCommand(`${CMD} -i ${file} -t ${version} ${strict ? '-s' : ''} 2> /dev/null`);
		return result;
	}
}



export class DepNodeProvider implements vscode.TreeDataProvider<TreeNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string | undefined, private provider: MyVirtualDocumentProvider) {
		this.provider = provider
	}

	async newUpgrade(version: string) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}
		const fileName = editor.document.fileName;
		const version_name = await vscode.window.showInputBox({
			prompt: 'Version name:',
			placeHolder: 'Type here...',
			value: '',  // Default value if any
			ignoreFocusOut: true,  // If true, the input box stays open even when focus moves to another part of the window
			// validateInput: validateInput  // Optional function to validate user input
		})
		const result = await runShellCommand(`${CMD} -i ${fileName} --new ${version_name} --upgrades ${version} 2> /dev/null`);
		try {
			// Overwrite the contents of the file
			fs.writeFileSync(fileName, result);
			vscode.window.showInformationMessage(`File ${fileName} overwritten successfully.`);
			this.refresh()
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error overwriting file: ${error.message}`);
		}
	}

	async newReplace(version: string) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}
		const fileName = editor.document.fileName;
		const version_name = await vscode.window.showInputBox({
			prompt: 'Version name:',
			placeHolder: 'Type here...',
			value: '',  // Default value if any
			ignoreFocusOut: true,  // If true, the input box stays open even when focus moves to another part of the window
			// validateInput: validateInput  // Optional function to validate user input
		})
		const result = await runShellCommand(`${CMD} -i ${fileName} --new ${version_name} --replaces ${version} 2> /dev/null`);
		try {
			// Overwrite the contents of the file
			fs.writeFileSync(fileName, result);
			vscode.window.showInformationMessage(`File ${fileName} overwritten successfully.`);
			this.refresh()
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error overwriting file: ${error.message}`);
		}
	}

	async strict_slice(version: string) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}
		const fileName = editor.document.fileName;
		const result = await runShellCommand(`${CMD} -i ${fileName} -t ${version} -s 2> /dev/null`);
		let doc = await vscode.workspace.openTextDocument({
			content: result,
			language: 'python'
		})
		await vscode.window.showTextDocument(doc, { preview: false });
	}

	async slice(version: string) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}
		const fileName = editor.document.fileName;
		let uri = vscode.Uri.parse('vpy:' + fileName + "?v=" + version);
		this.provider.onDidChangeEmitter.fire(uri)
		let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
		await vscode.window.showTextDocument(doc, { preview: false });
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TreeNode): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: TreeNode): Promise<(TreeNode)[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No versions in empty workspace');
			return Promise.resolve([]);
		}

		if (element instanceof VersionNode) {
			const headers = []
			if (element.commits.length > 0) {
				const commitHeader = new HeaderNode('Commits', vscode.TreeItemCollapsibleState.Collapsed, new vscode.ThemeIcon('git-commit'), element.commits);
				headers.push(commitHeader)
			}
			if (element.commits.length > 0) {
				const branchHeader = new HeaderNode('Branches', vscode.TreeItemCollapsibleState.Collapsed, new vscode.ThemeIcon('repo-forked'), element.branches);
				headers.push(branchHeader)
			}
			return headers;
		}
		else if (element instanceof HeaderNode) {
			return element.children
		}
		else {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const currentFilePath = editor.document.uri.fsPath
				if (this.pathExists(currentFilePath)) {
					const result = await runShellCommand(`${CMD} -i ${currentFilePath} -g`);
					const graph = JSON.parse(result)
					const versionNodes: VersionNode[] = Object.keys(graph).map(versionKey => this.makeNode(versionKey, graph[versionKey]));
					return versionNodes;
				} else {
					vscode.window.showInformationMessage('Workspace has no package.json');
					return [];
				}
			}
		}
		return [];

	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}

	private makeNode(label: string, obj: any): any {
		const branches = obj.branches.map((branch: { [x: string]: any; }) => Object.keys(branch).map(branchKey => this.makeNode(branchKey, branch[branchKey]))).reduce((acc: string | any[], current: any) => acc.concat(current), [])
		const commits = obj.commits.map((commit: { [x: string]: any; }) => Object.keys(commit).map(commitKey => this.makeNode(commitKey, commit[commitKey]))).reduce((acc: string | any[], current: any) => acc.concat(current), [])
		return new VersionNode(label, (branches.length + commits.length) == 0 ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed, commits, branches)
	}
}

export class HeaderNode extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly icon: vscode.ThemeIcon,
		public readonly children: VersionNode[]

	) {
		super(label, collapsibleState);
		this.iconPath = icon
		this.children = children
	}

}

export class VersionNode extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly commits: VersionNode[],
		public readonly branches: VersionNode[],

	) {
		super(label, collapsibleState);
		this.commits = commits
		this.branches = branches
	}
	contextValue = "version"
	// Implement additional methods or properties if needed
}

async function runShellCommand(command: string): Promise<any> {
	return new Promise((resolve, reject) => {
		cp.exec(command, (error, stdout) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
	});
}

type TreeNode = VersionNode | HeaderNode;

