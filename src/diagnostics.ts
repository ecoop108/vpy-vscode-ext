import * as vscode from 'vscode';
import * as cp from 'child_process';

interface ReportData {
	description: string;
	filename: string;
	absolute_filename: string;
	code: string;
	lineno: number;
	end_lineno: number;
	col_offset: number;
	end_col_offset: number;
	context: string;
	message: string;
}

function parseReport(report: string): [ReportData] | null {
	try {
		// Parse the JSON content
		const jsonData: [ReportData] = JSON.parse(report);
		return jsonData;
	} catch (error) {
		console.error('Error parsing JSON:', error);
		return null;
	}
}

export function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	const CMD = vscode.workspace.getConfiguration('vpy').get('pythonPath', 'python3') + " -m vpy.typechecker.pyanalyze";
	function runShellCommand(): Promise<[ReportData] | null> {
		return new Promise((resolve, reject) => {
			cp.exec(`${CMD} ${document.fileName} --json-output`, (error, stdout) => {
				if (stdout) {
					const reportData = parseReport(stdout);
					resolve(reportData);
					return
				}
				else {
					reject(error)
				}
			});
		});
	}

	if (document) {
		// Run command and get json output
		runShellCommand().then((output) => {
			if (output == null) {
				collection.delete(document.uri);
				return
			}

			collection.set(document.uri, output.map(e => ({
				code: e.code,
				message: e.description,
				range: new vscode.Range(e.lineno - 1, e.col_offset, e.end_lineno - 1, e.end_col_offset),
				severity: vscode.DiagnosticSeverity.Error,
				source: "Pyanalyze",
				relatedInformation: [],
			})));
		}).catch((error) => {
			collection.delete(document.uri);
			return;
		})
	} else {
		collection.clear();
	}
}

