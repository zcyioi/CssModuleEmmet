

# Css Module Emmet

在 React / TSX 文件中通过 Emmet 风格语法快速生成带 className={css.xxx} 的代码结构


## 🚀 功能介绍

| 输入                    | 展开结果                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `div.content`           | `<div className={css.content}></div>`                                   |
| `span.title`            | `<span className={css.title}></span>`                                   |
| `div.wrapper>span.text` | `<div className={css.wrapper}><span className={css.text}></span></div>` |
| `h1#main.title{Hello}`  | `<h1 id="main" className={css.title}>Hello</h1>`                        |
---

## ⚙️ 使用

1. 在任意 **JSX / TSX 文件** 中输入简写：

   ```
   div.box>p.text{Hello}
   ```
2. 按下 **Tab** 键自动展开为：

   ```html
   <div className={css.box}><p className={css.text}>Hello</p></div>
   ```

![演示效果](https://github.com/zcyioi/CssModuleEmmet/blob/main/images/shiyong.gif?raw=true)

---- 

## 🧩 配置项

在 VS Code `settings.json` 中添加：

```json
{
  "myEmmet.cssPrefix": "styles" // default :css
}
```

此时：

```
div.content → <div className={styles.content}></div>
```

## 🧠 支持语法说明

| 语法 | 示例       | 说明           |
| ---- | ---------- | -------------- |
| `.`  | `div.box`  | 生成 className |
| `#`  | `h1#title` | 生成 id        |
| `>`  | `div>span` | 嵌套标签       |
| `+`  | `div+span` | 同级标签       |
| `{}` | `p{Hello}` | 文本内容       |

不支持：

* `*3`（倍数展开）
* 属性表达式（如 `[attr=value]`）

---

## 💡 快捷键说明

| 快捷键  | 功能                | 适用范围     |
| ------- | ------------------- | ------------ |
| **Tab** | 展开缩写为 JSX 结构 | `jsx`, `tsx` |


