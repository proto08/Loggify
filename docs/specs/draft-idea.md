# Loggify — 仕様ドラフト

> アプリケーション設計は [`app/`](./app/README.md) で具体化した。内容が食い違う場合は `app/` を優先する（変更点は `app/README.md` を参照）。
> 本書は当初のアイデアを、現行の設計に合わせて更新したもの。詳細は各節に示した `app/` の章を参照する。

## 概要

現状の「Discord 認証 + ロギング」単機能アプリを、複数の Discord サーバーを横断的に管理できるダッシュボード付き管理アプリに拡張する。

---

## エンティティ定義

### ユーザー (User)

- Discord サーバーに参加し、認証フローを経るエンドユーザー。
- **本システムのアカウントは持たない**（ログ収集の対象）。
- 複数のサーバーに所属する可能性がある（同一 Discord アカウントが複数サーバーで認証されうる）。
- 識別子は Discord ユーザー ID。

### システムユーザー (System User)

- 本システム（ダッシュボード）の利用者・管理者。
- 組織・サーバーを管理する。
- 1人のシステムユーザーが作成できる組織は **1つまで**（サブスクリプションで拡張予定）。所属できる組織の数に制限はない。
- 他ユーザーの組織には招待で所属できる（N:M）。

### サーバー (Server)

- Discord サーバー（ギルド）を指す。
- システムユーザーが Loggify に登録・管理する。
- 1つのサーバーは必ず1つの組織に属する。
- サーバーごとに Bot トークン・Webhook・ロール ID などの設定を持つ。
- 1組織あたり **5サーバーまで** 登録可能（サブスクリプションで拡張予定）。

### ログ (Log)

- サーバー ID に紐づく、ユーザーの認証ログ。
- 1件 = 1回の認証イベント。
- 含まれる情報:
  - Discord ユーザー情報（ID, username, global_name, avatar 等）
  - IP アドレス・ISP・ASN・都市・国
  - GPS 座標・逆ジオコーディング住所（サーバー設定で収集する場合のみ）
  - 画面サイズ・UserAgent
  - ブラウザフィンガープリント（合成ハッシュ + WebGL / Canvas の生の値）
  - 認証日時
- IP・GPS・UA・フィンガープリントなどの詳細個人データは、保存期間（既定 90 日）を過ぎると消去し、要約だけを残す（`app/06-privacy.md`）。

### 組織 (Organization)

- システムユーザーが作成・所有するグループ単位。
- 複数の Discord サーバーをまとめて管理する。
- 組織単位でシステムユーザーを招待・権限付与できる。データ分離の境界でもある。

---

## エンティティ関係図

```
Organization (組織)
  └── 1:N ── Server (Discordサーバー)
                └── 1:N ── Log (認証ログ)
                             └── N:1 ── User (Discordユーザー)

SystemUser (システムユーザー)
  └── N:M ── Organization (組織)  ※ メンバーとして所属。作成（所有）できるのは 1 人 1 組織まで
```

---

## 機能一覧

機能の ID と MVP の範囲は `app/01-overview.md` §5 を参照。

### システムユーザー認証
- Discord OAuth2 ログイン
- Microsoft(Entra ID) OAuth2 ログイン
- Passkey（WebAuthn）はログイン後の追加登録のみ（単体でのログイン・新規登録は不可）
- 認証基盤は Better Auth（`app/05-auth-session.md`）

### 組織管理
- 組織の作成・編集・削除
- 組織へのサーバー追加・除外
- メンバー招待・除外・ロール変更・オーナー移譲

#### メンバー招待フロー
- `owner` が招待リンクを発行する。`admin` は `viewer` の招待のみ発行できる
- 発行時に以下を指定:
  - 付与するロール（`admin` / `viewer`）
  - 有効期限（1時間 / 24時間 / 7日）
- リンクは **1回使い切り**（使用後は無効化）。同時発行数の上限はない
- 期限切れ・使用済みのリンクはアクセス不可
- 権限マトリクスと自前実装の理由は `app/05-auth-session.md` §6

### サーバー管理
- サーバーの登録（Bot トークン・Role ID・OAuth アプリの Client ID / Secret 等の設定）
- サーバーごとの認証設定（VPN ブロック ON/OFF、GPS の収集、保存期間、メールアドレスの収集）
- 通知チャネルの設定（Discord Webhook。Telegram は Post-MVP）

#### Discord Bot
- REST API のみ（永続接続なし）
- FastAPI から Bot トークンで Discord REST API を直接呼び出す
- 用途: ロール付与のみ（MVP）

### ログ閲覧
- サーバー別・組織横断での認証ログ一覧
- ユーザー検索（Discord ID / IP / 国 等でフィルタ）
- ログ詳細表示
- Discord ID を指定した個人データの削除

### VPN ASN リスト

ASN ベースの VPN/プロキシ検出は、以下の3レイヤーで管理する。

```
Loggify デフォルト ASN リスト（システム管理）
Organization レベルのルール（許可 / ブロック）
Server レベルのルール（許可 / ブロック）
```

**評価順序（より具体的なスコープが優先）:**

1. サーバールールに一致 → その action（許可 / ブロック）
2. 組織ルールに一致 → その action
3. デフォルトリストに一致 → ブロック
4. どれにも一致しない → 許可

組織でブロックした ASN を、サーバーで許可に上書きできる。組織・サーバーは常に最新のデフォルトリストを参照する（`app/05-auth-session.md` §9）。

---

### サーバー登録フロー

システムユーザーがダッシュボードでサーバーを登録する際に入力する情報:

| 項目 | 説明 |
|---|---|
| Discord Guild ID | 対象サーバーの ID（有効なサーバー間で一意） |
| Discord Client ID | OAuth2 アプリの Client ID |
| Discord Client Secret | OAuth2 アプリの Client Secret |
| Discord Bot Token | ロール付与用 Bot のトークン |
| Discord Role ID | 認証後に付与するロール |
| Discord Webhook URL | ログ通知先 Webhook（任意） |

登録後、Loggify が内部 UUID（`server_id`）を発行し、以下を案内する:

```
redirect_uri: https://loggify.com/api/verify/[server-id]/callback   （Discord Developer Portal に登録する）
認証開始 URL: https://loggify.com/v/[server-id]                       （Discord サーバーに貼る）
```

登録フロー内で Bot 招待リンクを生成・表示し、Bot がギルドに参加済みか API で確認する。確認が通るまでは下書き（`draft`）のままで、認証は使えない（`app/02-screens.md` §2.3）。

### 認証フロー（マルチテナント）

```
[Discord サーバーに貼る URL]
https://loggify.com/v/[server-id]
  → 収集データの説明・同意（同意しない場合は進めない）

GET /api/verify/[server-id]/start
  → 認証セッションを作成し、Discord の authorize URL（state 付き）へリダイレクト

GET /api/verify/[server-id]/callback?code=...&state=...
  → 当該サーバーの Client ID / Secret で code を交換
  → Discord ユーザー情報を取得。アクセストークン・リフレッシュトークンは保存せず破棄
  → /verify/[server-id] にリダイレクト

GET /verify/[server-id]
  → GPS（設定による）・画面サイズ・ブラウザフィンガープリントの収集 + hCaptcha

complete（Server Action）
  → hCaptcha 検証・VPN チェック・ロール付与・ログ保存・通知送信
  → /result/[server-id]/[status] にリダイレクト
```

詳細は `app/05-auth-session.md` §10。サイト全体の前段には Cloudflare（WAF・Under Attack Mode 常時 ON）を置く。

---

## 通知チャネル

| チャネル | 優先度 |
|---|---|
| Discord Webhook | MVP |
| Telegram Bot | Post-MVP |

チャネルは `notification_channels` に分離し、チャネル単位で有効/無効を切り替えられる。
通知はログごとに即時送信（同期）。送信失敗時はリトライなし（ログ本体は DB に保存済みのためデータ損失なし）。失敗はログの `notify_status` に記録する。
通知には認証結果・国・VPN 判定・Discord ユーザー情報・メールアドレス（収集時）・ダッシュボードへのリンクのみを含め、IP・GPS・住所・UA・フィンガープリントは含めない。

---

## セッション管理

- システムユーザーは Better Auth のセッション（DB セッション + `HttpOnly` Cookie）で管理する。Refresh Token は使わない
- Passkey は追加の認証手段として、ログイン後に登録する
- どちらの方式でログインしても、同じセッションになる
- Next.js が FastAPI を呼ぶときは、Better Auth の JWT プラグインで都度発行した短命 JWT（有効期限 30 秒。`sub` / `org_id` / `role`）を `Authorization: Bearer` で渡し、FastAPI は JWKS で署名を検証する（`app/05-auth-session.md` §3）

---

## ログの保持・削除ポリシー

- 詳細個人データ（IP・位置・UA・フィンガープリント等）は、サーバーごとの保存期間（既定 90 日）を過ぎたら消去する。認証結果・国・ASN・日時などの要約は残す
- サーバー削除時は論理削除とし、30 日後にログを物理削除する
- 組織のメンバー（viewer 以上）は自組織のサーバーのログを閲覧できる。システム管理者は全組織のログを閲覧できるが、閲覧はすべて監査ログに記録する
- 個人データの削除は、組織による Discord ID 指定の削除、またはエンドユーザーから Loggify への依頼で行う

詳細は `app/06-privacy.md`。

---

## フロントエンド ↔ API 間の通信

- **BFF 構成**: ブラウザは Next.js（`loggify.com`）とだけ通信する。FastAPI はインターネットに公開しない（内部 ingress のみ）
- FastAPI は REST（`/v1`）。呼び出しは Next.js のサーバー側（Server Components / Server Actions / Route Handlers）から行う
- ブラウザと Next.js の間は Better Auth の Cookie（`HttpOnly; Secure; SameSite=Lax`）。CORS の設定は不要

---

## マルチテナントのデータ分離

- **アプリ層フィルタ**（SQLAlchemy の repository 層で `WHERE org_id = :org_id AND id = :id` を必ず付与）
- **加えて `app` スキーマに Row Level Security を導入**（アプリのバグによる他組織データの漏えいを DB 側でも防ぐ）。`org_id` は JWT のクレームから取得し、トランザクションごとに設定する

---

## エラー・結果画面

- `/result/[server-id]/[status]` でサーバーごとにルーティング
- サーバー設定からサーバー名・アイコンを表示
- カスタムメッセージは将来対応

---

## レート制限

- 同一 IP、および同一サーバー + 同一 Discord ID の両方で制限
- MVP はプロセス内メモリ（トークンバケット）で実装。レプリカを増やす段階で Redis 等に移す
- 具体的な制限値は運用しながら調整（初期値は `app/03-api.md` §3）

---

## 組織・サーバーの上限

- 1ユーザーが作成できる組織: **1つまで**
- 1組織に登録できるサーバー: **5つまで**
- サブスクリプションプランで上限を拡張予定

---

## 決定事項の参照先

以前この TODO に書いていた項目は、`app/` で決定した。

| 項目 | 参照先 |
|---|---|
| RBAC（3 ロールのマトリクス） | `app/05-auth-session.md` §6.2 |
| ダッシュボード画面構成 | `app/02-screens.md` |
| ASN ルールの優先順位・デフォルトリストの更新 | `app/05-auth-session.md` §9 |
| セッション管理・JWT | `app/05-auth-session.md` §3, §5 |
| サーバー登録フロー（Bot 招待の誘導 UI、CAPTCHA のキーは Loggify 共通） | `app/02-screens.md` §2.3 |
| ログの保持・削除 | `app/06-privacy.md` |
| 招待リンクの仕様 | `app/05-auth-session.md` §6.3 |
| 通知の設計 | `app/05-auth-session.md` §10.3, `app/06-privacy.md` §4 |
| フロントエンド ↔ API の通信、データ分離 | `app/05-auth-session.md` §1, `app/04-data-model.md` §5 |

CAPTCHA は hCaptcha を使う。サイトキーとシークレットキーは Loggify 共通で、サーバーごとには持たない。

## 未決事項

- **サブスクリプションプラン設計**: 無料 / 有料プランの区分、組織数・サーバー数の上限拡張、その他の差別化要素
- そのほかの未決事項は [`docs/todo.md`](../todo.md) にまとめている
