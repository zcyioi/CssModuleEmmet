import * as vscode from 'vscode';
import {parseShorthand, generateJSX} from './parser';

function getPrefix(): string {
	const cfg = vscode.workspace.getConfiguration('cssModuleEmmet');
	return (cfg.get('cssPrefix') as string) || 'css';
}

let latestPreview = '';
let suggestVisible = false;
let lastTriggerTime = 0;

export function activate(context: vscode.ExtensionContext) {

	// // ----------------------------
	// // ② 补全预览（原功能）
	// // ----------------------------
	// const previewProvider = vscode.languages.registerCompletionItemProvider(
	// 	[
	// 		{language: 'typescriptreact'},
	// 		{language: 'javascriptreact'},
	// 		{language: 'html'},
	// 		{language: 'javascript'},
	// 		{language: 'typescript'},
	// 	],
	// 	{

	// 		provideCompletionItems(document, position) {
	// 			console.log("provider");
	// 			const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9.#>{}_+\-:]+/);
	// 			console.log("range:", range)
	// 			if (!range) return undefined;

	// 			const token = document.getText(range);
	// 			// if (!/[.>{+{]/.test(token)) return undefined;

	// 			try {
	// 				const ast = parseShorthand(token);
	// 				if (!ast) return undefined;
	// 				const cssPrefix = getPrefix();
	// 				const jsx = generateJSX(ast, cssPrefix);
	// 				console.log("jsx:", jsx)

	// 				// ✅ “预览项”类型的补全条目
	// 				const previewItem = new vscode.CompletionItem('JSX Preview', vscode.CompletionItemKind.Text);
	// 				const md = new vscode.MarkdownString();
	// 				md.appendMarkdown('**Preview:**\n\n```jsx\n' + jsx + '\n```');
	// 				md.isTrusted = true;
	// 				previewItem.documentation = md;
	// 				previewItem.detail = 'Preview JSX output';
	// 				previewItem.sortText = '\u0000'; // 保证永远排最前
	// 				previewItem.filterText = token; // 匹配当前输入
	// 				previewItem.insertText = ''; // 不插入内容（只是预览）

	// 				return [previewItem];
	// 			} catch (e) {
	// 				console.log("error", e)
	// 				return undefined;
	// 			}
	// 		},
	// 	},
	// 	// ✅ 触发字符
	// 	'.', '>', '+'
	// );

	// context.subscriptions.push(previewProvider);

	// ----------------------------
	// ① Tab 展开命令（原功能）
	// ----------------------------
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
			const indentText = lineText.match(/^\s*/)?.[0] ?? '';
			const jsx = generateJSX(ast, cssPrefix, 0, indentText);

			const tokenStartChar = lineText.lastIndexOf(token);
			const tokenStart = new vscode.Position(pos.line, tokenStartChar);
			const range = new vscode.Range(tokenStart, pos);

			await editor.edit(editBuilder => {
				editBuilder.replace(range, jsx);
			});

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



	// vscode.workspace.onDidChangeTextDocument((event) => {

	// 	console.log("change")
	// 	const editor = vscode.window.activeTextEditor;
	// 	if (!editor || event.document !== editor.document) return;

	// 	const lang = editor.document.languageId;
	// 	if (!['typescriptreact', 'javascriptreact', 'html', 'typescript', 'javascript'].includes(lang)) return;

	// 	const change = event.contentChanges[0];
	// 	if (!change || !change.text) return;
	// 	const char = change.text;

	// 	if (/^[a-zA-Z0-9.#>{}_+\-:]$/.test(char)) {
	// 		// 💡 1. 关闭当前补全
	// 		vscode.commands.executeCommand('hideSuggestWidget').then(() => {
	// 			// 💡 2. 下一帧再重新打开（强制触发 provider）
	// 			setTimeout(() => {
	// 				vscode.commands.executeCommand('editor.action.triggerSuggest');
	// 			}, 10); // 稍微延迟一点以确保输入状态稳定
	// 		});
	// 	}
	// });

}

// ----------------------------
// 辅助函数：插入 Tab
// ----------------------------
async function insertTab(editor: vscode.TextEditor) {
	const tabSize = editor.options.tabSize || 2;
	const insert = editor.options.insertSpaces ? ' '.repeat(Number(tabSize)) : '\t';
	await editor.edit(edit => {
		for (const sel of editor.selections) {
			edit.insert(sel.active, insert);
		}
	});
}

// ----------------------------
// 辅助函数：定位光标
// ----------------------------
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


export function deactivate() {
}
