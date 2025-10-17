import * as vscode from 'vscode';
import {parseShorthand, generateJSX} from './parser';

function getPrefix(): string {
	const cfg = vscode.workspace.getConfiguration('cssModuleEmmet');
	return (cfg.get('cssPrefix') as string) || 'css';
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('cssModuleEmmet.expand', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const doc = editor.document;
		const sel = editor.selection;
		const pos = sel.active;

		const line = doc.lineAt(pos.line);
		const lineText = line.text.substring(0, pos.character);
		const maxLen = 200;
		const searchText = lineText.slice(Math.max(0, lineText.length - maxLen));

		const m = searchText.match(/([^\s]+)$/);
		if (!m) {
			await insertTab(editor);
			return;
		}

		const token = m[1];
		if (!/^[a-zA-Z0-9.#>{}_+\-\:]+$/.test(token)) {
			await insertTab(editor);
			return;
		}

		try {
			const ast = parseShorthand(token);
			if (!ast) {
				await insertTab(editor);
				return;
			}

			const cssPrefix = getPrefix();

			// 计算当前行光标前的缩进
			const indentText = lineText.match(/^\s*/)?.[0] ?? '';
			const jsx = generateJSX(ast, cssPrefix, 0, indentText);

			const tokenStartChar = lineText.lastIndexOf(token);
			const tokenStart = new vscode.Position(pos.line, tokenStartChar);
			const range = new vscode.Range(tokenStart, pos);

			await editor.edit(editBuilder => {
				editBuilder.replace(range, jsx);
			});

			// 将光标移动到第一个标签的内部位置（如果可行）
			const newPos = findCursorAfterFirstOpenTag(editor, tokenStart, jsx);
			if (newPos) {
				editor.selection = new vscode.Selection(newPos, newPos);
			}
		} catch (err) {
			console.error('cssModuleEmmet expand error', err);
			await insertTab(editor);
		}
	});

	context.subscriptions.push(disposable);
}

async function insertTab(editor: vscode.TextEditor) {
	const tabSize = editor.options.tabSize || 2;
	const insert = editor.options.insertSpaces ? ' '.repeat(Number(tabSize)) : '\t';
	await editor.edit(edit => {
		for (const sel of editor.selections) {
			edit.insert(sel.active, insert);
		}
	});
}

function findCursorAfterFirstOpenTag(
	editor: vscode.TextEditor,
	startPos: vscode.Position,
	insertedText: string
): vscode.Position | null {
	const doc = editor.document;
	const startOffset = doc.offsetAt(startPos);
	const endOffset = startOffset + insertedText.length;
	try {
		const after = doc.getText(new vscode.Range(startPos, doc.positionAt(endOffset)));
		const idx = after.indexOf('>');
		if (idx === -1) return doc.positionAt(endOffset);
		return doc.positionAt(startOffset + idx + 1);
	} catch {
		return null;
	}
}

export function deactivate() { }
