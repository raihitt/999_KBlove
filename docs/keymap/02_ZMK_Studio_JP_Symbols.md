# 日本語Windows環境 ZMK Studio 特殊記号対応表

このドキュメントでは、日本語 Windows 環境で ZMK Studio を使用してキーを割り当てる際の、物理キーと実際に入力される記号の対応表をまとめています。

## 記号キー対応表

| 入力したい記号 | ZMK Studio 設定 | Shift | Id | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| `1` | Keyboard 1 and Bang | なし | `0x1E` | |
| `!` | Keyboard 1 and Bang | あり | `0x1E` | |
| `2` | Keyboard 2 and At | なし | `0x1F` | |
| `"` | Keyboard 2 and At | あり | `0x1F` | JP: Shift+2 = `"` |
| `3` | Keyboard 3 and Hash | なし | `0x20` | |
| `#` | Keyboard 3 and Hash | あり | `0x20` | |
| `4` | Keyboard 4 and Dollar | なし | `0x21` | |
| `$` | Keyboard 4 and Dollar | あり | `0x21` | |
| `5` | Keyboard 5 and Percent | なし | `0x22` | |
| `%` | Keyboard 5 and Percent | あり | `0x22` | |
| `6` | Keyboard 6 and Caret | なし | `0x23` | |
| `&` | Keyboard 6 and Caret | あり | `0x23` | JP: Shift+6 = `&` |
| `7` | Keyboard 7 and Ampersand | なし | `0x24` | |
| `'` | Keyboard 7 and Ampersand | あり | `0x24` | JP: Shift+7 = `'` |
| `8` | Keyboard 8 and Star | なし | `0x25` | |
| `(` | Keyboard 8 and Star | あり | `0x25` | JP: Shift+8 = `(` |
| `9` | Keyboard 9 and Left Bracket | なし | `0x26` | |
| `)` | Keyboard 9 and Left Bracket | あり | `0x26` | JP: Shift+9 = `)` |
| `0` | Keyboard 0 and Right Bracket | なし | `0x27` | |
| `-` | Keyboard Dash and Underscore | なし | `0x2D` | JP: `ほ` キー |
| `=` | Keyboard Equals and Plus | なし | `0x2E` | JP: `へ` キー |
| `~` | Keyboard Equals and Plus | あり | `0x2E` | JP: Shift+`へ` = `~` |
| `@` | Keyboard Left Brace | なし | `0x2F` | JP: `@` キー |
| `` ` `` | Keyboard Left Brace | あり | `0x2F` | JP: Shift+`@` = `` ` `` |
| `[` | Keyboard Right Brace | なし | `0x30` | ✅確認済 |
| `{` | Keyboard Right Brace | あり | `0x30` | |
| `]` | Keyboard Backslash and Pipe | なし | `0x31` | ✅確認済 |
| `}` | Keyboard Backslash and Pipe | あり | `0x31` | |
| `;` | Keyboard SemiColon and Colon | なし | `0x33` | |
| `+` | Keyboard SemiColon and Colon | あり | `0x33` | JP: Shift+`;` = `+` |
| `:` | Keyboard Left Apos and Double | なし | `0x34` | JP: `:` キー |
| `*` | Keyboard Left Apos and Double | あり | `0x34` | JP: Shift+`:` = `*` |
| `,` | Keyboard Comma and LessThan | なし | `0x36` | |
| `<` | Keyboard Comma and LessThan | あり | `0x36` | |
| `.` | Keyboard Period and GreaterThan | なし | `0x37` | |
| `>` | Keyboard Period and GreaterThan | あり | `0x37` | |
| `/` | Keyboard ForwardSlash and QuestionMark | なし | `0x38` | |
| `?` | Keyboard ForwardSlash and QuestionMark | あり | `0x38` | |
| `\` / `¥` | Keyboard International3 | なし | `0x89` | JP: `¥` キー（バックスラッシュ） |
| `_` | Keyboard International1 | あり | `0x87` | JP: `ろ` キー ✅確認済 |

## 日本語キー専用

| キー | ZMK Studio 設定 | Id |
| :--- | :--- | :--- |
| 変換 | Keyboard International4 | `0x8A` |
| 無変換 | Keyboard International5 | `0x8B` |
| かな/カタカナ | Keyboard International2 | `0x88` |
| 半角/全角 | Keyboard LANG5 | `0x94` |

## 注意事項
- `^` を入力したい場合：`0x23`（Shift+6）は JP 配列では `&` になるため不可。
  - → `^` は `Keyboard Left Brace`（`0x2F`）の Shift なしで入力。
- Shift ありの設定は ZMK Studio で `&kp LS(キーコード)` として割り当てます。
