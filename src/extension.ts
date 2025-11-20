import * as vscode from 'vscode';
import {parseShorthand, generateJSX} from './parser';

function getPrefix(): string {
	const cfg = vscode.workspace.getConfiguration('cssModuleEmmet');
	return (cfg.get('cssPrefix') as string) || 'css';
}

export function activate(context: vscode.ExtensionContext) {

	// ----------------------------
	// ② 补全预览（原功能）
	// ----------------------------
	const previewProvider = vscode.languages.registerCompletionItemProvider(
		[
			{language: 'typescriptreact'},
			{language: 'javascriptreact'}
		],
		{
			provideCompletionItems(document, position) {
				const lineText = document.lineAt(position.line).text;
				// 避免在赋值语句中触发
				if (lineText.includes('=')) return undefined;

				const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9.#>{}_+\-:]+/);
				if (!range) return undefined;

				const token = document.getText(range);

				// 仅在包含符号时触发
				if (!/[.>#+]/.test(token)) return undefined;

				try {
					const ast = parseShorthand(token);
					if (!ast) return undefined;

					const cssPrefix = getPrefix(); // 例如返回 'css'
					const jsx = generateJSX(ast, cssPrefix);

					// 创建预览补全项
					const previewItem = new vscode.CompletionItem(
						token,
						vscode.CompletionItemKind.Snippet
					);

					// Markdown 预览内容
					const md = new vscode.MarkdownString();
					md.appendMarkdown('```jsx\n' + jsx + '\n```');
					md.isTrusted = true;
					previewItem.documentation = md;

					// 显示细节说明
					previewItem.detail = 'Css Module Emmet';
					previewItem.sortText = '\u0001'; // 让它排在最前
					previewItem.filterText = token; // 跟当前输入一致
					previewItem.insertText = jsx; // entry 补齐
					// 替换当前输入的范围
					previewItem.range = range;

					// 返回动态补全列表（Emmet 同款）
					// 第二个参数 true 表示“补全不完整”，允许动态刷新
					return new vscode.CompletionList([previewItem], true);
				} catch (e) {
					console.error('Error in JSX preview provider:', e);
					return undefined;
				}
			},
		},
		// 触发字符
		'.', '>', '+',
	);

	context.subscriptions.push(previewProvider);
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
