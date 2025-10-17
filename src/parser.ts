// Improved Emmet-like parser supporting + (siblings) and > (nesting)
// Correctly handles chains like div.a>div.b+div.c>div.d

export type Node = {
    tag: string;
    id?: string;
    classes?: string[];
    text?: string;
    children?: Node[];
};

function escapeText(t: string) {
    return t.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Parse single segment: div.a#id{text}
function parseElement(seg: string): Node | null {
    let text: string | undefined;
    const textMatch = seg.match(/\{([^}]*)\}$/);
    if (textMatch) {
        text = textMatch[1];
        seg = seg.slice(0, textMatch.index);
    }

    const tagMatch = seg.match(/^[a-zA-Z][\w-]*/);
    if (!tagMatch) return null;
    const tag = tagMatch[0];
    let rest = seg.slice(tag.length);

    const classes: string[] = [];
    let id: string | undefined;

    let idx = 0;
    while (idx < rest.length) {
        const ch = rest[idx];
        if (ch === '.') {
            idx++;
            let cls = '';
            while (idx < rest.length && /[^\.\#\{]/.test(rest[idx])) cls += rest[idx++];
            if (cls) classes.push(cls);
        } else if (ch === '#') {
            idx++;
            let iName = '';
            while (idx < rest.length && /[^\.\#\{]/.test(rest[idx])) iName += rest[idx++];
            if (iName) id = iName;
        } else idx++;
    }

    return {tag, id, classes: classes.length ? classes : undefined, text};
}

// Build tree honoring > and +
export function parseShorthand(input: string): Node | null {
    const root: Node = {tag: '__root__', children: []};
    const stack: Node[] = [root];

    // Tokenize respecting braces
    let buf = '';
    let inBrace = false;
    const flush = (segment: string) => {
        const el = parseElement(segment.trim());
        if (el) {
            const parent = stack[stack.length - 1];
            parent.children = parent.children || [];
            parent.children.push(el);
            return el;
        }
        return null;
    };

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '{') inBrace = true;
        if (ch === '}') inBrace = false;

        if (!inBrace && (ch === '>' || ch === '+')) {
            const el = flush(buf);
            buf = '';
            if (!el) continue;

            if (ch === '>') {
                // Nest: push last element as new parent
                stack.push(el);
            } else if (ch === '+') {
                // Sibling: pop previous sibling if exists
                if (stack.length > 1 && !stack[stack.length - 1].children?.length) {
                    // no-op
                }
                // ensure we're at parent level
                while (stack.length > 1 && !stack[stack.length - 1].children) {
                    stack.pop();
                }
                // keep current parent
            }
        } else {
            buf += ch;
        }
    }

    flush(buf);

    return root.children && root.children.length === 1 ? root.children[0] : root;
}

export function generateJSX(
    node: Node,
    cssPrefix = 'css',
    indent = 0,
    baseIndent = '',
    isRoot = true // 是否为第一行
): string {
    // 第一行不加 baseIndent，其他行加
    const indentStr = isRoot ? baseIndent : baseIndent + '  '.repeat(indent);

    if (node.tag === '__root__' && node.children) {
        // 顶层多个兄弟节点
        return node.children
            .map((c, i) => i === 0 ? generateJSX(c, cssPrefix, indent, baseIndent, i === 0) : generateChildrenJSX(c, cssPrefix, indent, baseIndent, false))
            .join('\n');
    }

    // 构造属性
    const attrs: string[] = [];
    if (node.id) attrs.push(`id="${node.id}"`);
    if (node.classes?.length) {
        if (node.classes.length === 1) {
            attrs.push(`className={${cssPrefix}.${node.classes[0]}}`);
        } else {
            const expr = node.classes.map(c => `\${${cssPrefix}.${c}}`).join(' ');
            attrs.push(`className={\`${expr}\`}`);
        }
    }
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    const hasChildren = node.children && node.children.length > 0;

    if (hasChildren) {
        // 递归生成子节点
        const inner = node.children!
            .map((c, i) => generateChildrenJSX(c, cssPrefix, indent + 1, baseIndent, false))
            .join('\n');

        // ✅ 闭合标签与开标签同缩进（使用 indentStr，而不是 baseIndent）
        return `<${node.tag}${attrStr}>\n${inner}\n${indentStr}</${node.tag}>`;
    } else {
        if (node.text) {
            return `<${node.tag}${attrStr}>${escapeText(node.text)}</${node.tag}>`;
        }
        return `<${node.tag}${attrStr}></${node.tag}>`;
    }
}
function generateChildrenJSX(
    node: Node,
    cssPrefix = 'css',
    indent = 0,
    baseIndent = '',
    isRoot = true // 是否为第一行
): string {
    // 第一行不加 baseIndent，其他行加
    const indentStr = isRoot ? baseIndent : baseIndent + '  '.repeat(indent);

    if (node.tag === '__root__' && node.children) {
        // 顶层多个兄弟节点
        return node.children
            .map((c, i) => generateChildrenJSX(c, cssPrefix, indent, baseIndent, i === 0))
            .join('\n');
    }

    // 构造属性
    const attrs: string[] = [];
    if (node.id) attrs.push(`id="${node.id}"`);
    if (node.classes?.length) {
        if (node.classes.length === 1) {
            attrs.push(`className={${cssPrefix}.${node.classes[0]}}`);
        } else {
            const expr = node.classes.map(c => `\${${cssPrefix}.${c}}`).join(' ');
            attrs.push(`className={\`${expr}\`}`);
        }
    }
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    const hasChildren = node.children && node.children.length > 0;

    if (hasChildren) {
        // 递归生成子节点
        const inner = node.children!
            .map((c, i) => generateChildrenJSX(c, cssPrefix, indent + 1, baseIndent, false))
            .join('\n');

        // ✅ 闭合标签与开标签同缩进（使用 indentStr，而不是 baseIndent）
        return `${indentStr}<${node.tag}${attrStr}>\n${inner}\n${indentStr}</${node.tag}>`;
    } else {
        if (node.text) {
            return `${indentStr}<${node.tag}${attrStr}>${escapeText(node.text)}</${node.tag}>`;
        }
        return `${indentStr}<${node.tag}${attrStr}></${node.tag}>`;
    }
}