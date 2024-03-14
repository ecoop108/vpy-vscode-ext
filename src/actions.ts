import * as vscode from 'vscode';
export class MyCodeActionProvider implements vscode.CodeActionProvider {
	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
		for (let i = 0; i < context.diagnostics.length; i++) {
			const d = context.diagnostics[i]
			if (d.code === 'self_relation_version') {
			}
			else if (d.code === 'undefined_version') {
				// const fix = new vscode.CodeAction(`Create missing version`, vscode.CodeActionKind.QuickFix);
				// fix.edit = new vscode.WorkspaceEdit();
				// const range = new vscode.Range(d.range.start.line - 1, 0, d.range.start.line - 1, 0)
				// fix.edit.replace(document.uri, range, "@version(name=)");
				// return [fix];
			}
		}
		return [];
	}
}