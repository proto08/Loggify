# 02. 画面設計

## 1. 画面一覧

### 1.1 公開画面（ログイン不要）

| パス | 画面 | 主な API |
|---|---|---|
| `/` | LP | — |
| `/login` | ログイン（Discord / Microsoft / Passkey、conditional UI 対応） | Better Auth 標準ルート（`/api/auth/sign-in/social`, `/api/auth/sign-in/passkey`） |
| `/invite/[token]` | 招待の受諾（未ログインなら `/login?next=` へ）。**自前実装**（05 §6.3） | `/invite/[token]` 自身の Route Handler が `auth` スキーマへ直接アクセス |
| `/legal/privacy`, `/legal/terms` | プライバシーポリシー・利用規約 | — |

### 1.2 認証フロー画面（エンドユーザー向け）

| パス | 画面 | 主な API |
|---|---|---|
| `/v/[serverId]` | 認証開始・同意 | `GET /v1/public/servers/{id}` |
| `/verify/[serverId]` | データ収集 + Turnstile | `GET /v1/verify/{id}/session`、`POST /v1/verify/{id}/complete`（Server Action） |
| `/result/[serverId]/[status]` | 結果 | `GET /v1/public/servers/{id}` |

`status` の値:

| status | 意味 | エンドユーザー向けの表示 |
|---|---|---|
| `success` | 認証成功・ロール付与済み | 完了しました。Discord に戻ってください |
| `vpn` | VPN/プロキシとしてブロック | VPN を切ってやり直してください |
| `captcha` | Turnstile 検証失敗 | もう一度お試しください |
| `declined` | 同意なし、または必須の GPS が拒否された | 認証には同意が必要です |
| `expired` | 認証セッションの期限切れ | 最初からやり直してください |
| `unavailable` | サーバーが無効・削除済み・Bot 未参加 | サーバー管理者に連絡してください |
| `rate_limited` | レート制限に到達 | しばらく待ってからやり直してください |
| `error` | その他 | エラーが発生しました |

### 1.3 ダッシュボード（ログイン必須）

| パス | 画面 | 必要ロール |
|---|---|---|
| `/dashboard` | 所属組織が 1 つならその組織へ、0 なら `/orgs/new`、複数なら組織選択 | — |
| `/orgs/new` | 組織の作成 | — |
| `/orgs/[orgId]` | 概要（直近の認証数・成功率・ブロック数・サーバー一覧） | viewer |
| `/orgs/[orgId]/logs` | 認証ログ一覧（フィルタ: サーバー・結果・期間・Discord ID・IP・国） | viewer |
| `/orgs/[orgId]/logs/[logId]` | 認証ログ詳細 | viewer |
| `/orgs/[orgId]/servers` | サーバー一覧 | viewer |
| `/orgs/[orgId]/servers/new` | サーバー登録ウィザード | admin |
| `/orgs/[orgId]/servers/[serverId]` | サーバー詳細（タブ構成は下記） | viewer（編集は admin） |
| `/orgs/[orgId]/asn` | 組織の ASN ルール | viewer（編集は admin） |
| `/orgs/[orgId]/members` | メンバー・招待リンク | viewer（編集は admin/owner） |
| `/orgs/[orgId]/audit` | 監査ログ | admin |
| `/orgs/[orgId]/settings` | 組織名の変更・オーナー移譲・組織削除 | owner（名前変更は admin） |
| `/orgs/[orgId]/data-requests` | 個人データの削除（Discord ID 指定） | admin |
| `/account` | プロフィール・Passkey・セッション・アカウント削除 | 本人 |
| `/admin/*` | システム管理（デフォルト ASN・組織一覧） | sysadmin |

サーバー詳細のタブ:

| タブ | 内容 |
|---|---|
| 概要 | 開始 URL（コピー）・redirect_uri・Bot の参加状態・直近のログ |
| 認証設定 | 有効/無効、VPN ブロック、GPS（off/optional/required）、email 収集、保存期間 |
| 資格情報 | Client ID（表示）、Client Secret / Bot Token（`••••` 表示・再入力で更新）、Role ID |
| 通知 | 通知チャネル一覧・追加・テスト送信 |
| ASN ルール | サーバー単位の許可/ブロック + 実効ルールのプレビュー |
| 危険な操作 | サーバーの削除 |

## 2. 画面遷移

### 2.1 エンドユーザーの認証フロー

```
Discord サーバーに貼られた開始 URL
  │
  ▼
/v/[serverId] ── サーバーが無効 ──────────────────────────▶ /result/[serverId]/unavailable
  │ 収集データの説明を読み「同意して続ける」
  ▼
/api/verify/[serverId]/start ─(302)─▶ Discord 認可画面
                                       │ 許可
                                       ▼
/api/verify/[serverId]/callback ── state 不一致・交換失敗 ──▶ /result/[serverId]/error
  │ (302)
  ▼
/verify/[serverId] ── セッションの期限切れ ───────────────▶ /result/[serverId]/expired
  │ GPS 許可ダイアログ（設定が optional/required のとき）
  │ Turnstile
  ▼
Server Action → FastAPI complete ─▶ { status } ────────▶ /result/[serverId]/[status]
```

### 2.2 システムユーザー

```
/login ─▶ Discord or Microsoft ─▶ /api/auth/callback/{provider} ─▶ /dashboard ─┬─ 組織 0 ─▶ /orgs/new ─▶ /orgs/[orgId]
                                                 ├─ 組織 1 ─▶ /orgs/[orgId]
                                                 └─ 組織 2+ ─▶ 組織選択

/invite/[token] ─ 未ログイン ─▶ /login?next=/invite/[token] ─▶ /invite/[token] ─ 受諾 ─▶ /orgs/[orgId]
```

### 2.3 サーバー登録ウィザード

```
Step 1: Guild ID・表示名の入力
Step 2: OAuth アプリ情報（Client ID / Secret）の入力
        → 表示された redirect_uri を Discord Developer Portal に登録するよう案内
Step 3: Bot Token・Role ID の入力
        → Bot 招待 URL を表示 → 「参加を確認」で API がギルド参加とロール階層をチェック
Step 4: 認証設定（VPN・GPS・保存期間）と通知 Webhook（任意）
Step 5: 完了 — 開始 URL `https://loggify.com/v/{serverId}` を表示
```

- 各ステップの確定で API に保存する（下書き状態 `status = draft` のサーバーとして作成）
- Step 3 のチェックが通るまでは `status = draft` のままで、開始 URL にアクセスしても `unavailable` を返す

## 3. UI 方針

- 既存方針を引き継ぎ、Tailwind CSS v4 + shadcn/ui、ダークテーマ固定
- 表の「主な API」は FastAPI のエンドポイント。ブラウザから直接は呼ばず、Next.js のサーバー側（Server Components / Server Actions / Route Handlers）から呼ぶ（05 §2.4）
- 更新系は Server Actions で実装する。クライアントコンポーネントから `fetch` で FastAPI を呼ぶことはない
- フォームのバリデーションは zod で定義し、最終判定は API 側で行う
- 秘密値（Client Secret・Bot Token・Webhook URL）は画面に再表示しない。更新時のみ入力させる
