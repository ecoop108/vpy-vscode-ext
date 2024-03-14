import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';

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

const REPORT_FILENAME = "/tmp/.pyanalyze_report"

function parseReport(): [ReportData] | null {
	try {
		// Read the file synchronously
		const fileContent = fs.readFileSync(REPORT_FILENAME, 'utf-8');
		// Parse the JSON content
		const jsonData: [ReportData] = JSON.parse(fileContent);
		return jsonData;
	} catch (error) {
		console.error('Error parsing JSON:', error);
		return null;
	}
}

export function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	const CMD = "python3 -m vpy.typechecker.pyanalyze"
	function runShellCommand(): Promise<[ReportData] | null> {
		return new Promise((resolve, reject) => {
			cp.exec(`${CMD} ${document.fileName} --json-output ${REPORT_FILENAME}`, (error, stdout) => {

				if (error) {
					const reportData = parseReport();
					resolve(reportData);
					return
				}
				resolve(null)
			});
		});
	}



	if (document) {
		// Run command and get json output
		runShellCommand().then((output) => {
			if (output == null) {
				collection.clear();
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
		})
	} else {
		collection.clear();
	}
}

