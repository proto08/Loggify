# Loggify — 仕様ドラフト

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
- 1人のシステムユーザーが複数の組織に所属できる（将来的な想定）。

### サーバー (Server)

- Discord サーバー（ギルド）を指す。
- システムユーザーが Loggify に登録・管理する。
- 1つのサーバーは必ず1つの組織に属する。
- サーバーごとに Bot トークン・Webhook・ロール ID などの設定を持つ。

### ログ (Log)

- サーバー ID に紐づく、ユーザーの認証ログ。
- 1件 = 1回の認証イベント。
- 含まれる情報:
  - Discord ユーザー情報（ID, username, global_name, avatar 等）
  - IP アドレス・ISP・ASN・都市・国
  - GPS 座標・逆ジオコーディング住所
  - 画面サイズ・UserAgent
  - WebGL / Canvas フィンガープリント
  - 認証日時

### 組織 (Organization)

- システムユーザーが作成・所有するグループ単位。
- 複数の Discord サーバーをまとめて管理する。
- 組織単位でシステムユーザーを招待・権限付与できる。

---

## エンティティ関係図

```
Organization (組織)
  └── 1:N ── Server (Discordサーバー)
                └── 1:N ── Log (認証ログ)
                             └── N:1 ── User (Discordユーザー)

SystemUser (システムユーザー)
  └── 1:N ── Organization (組織)  ※ 将来的には N:M
```

---

## 機能一覧

### システムユーザー認証
- Discord OAuth2 ログイン
- Passkey（WebAuthn）ログイン

### 組織管理
- 組織の作成・編集・削除
- 組織へのサーバー追加・除外
- メンバー招待・除外

#### メンバー招待フロー
- `owner` / `admin` が招待リンクを発行する
- 発行時に以下を指定:
  - 付与するロール（`admin` / `viewer`）
  - 有効期限（発行時に選択）
- リンクは **1回使い切り**（使用後は無効化）
- 期限切れ・使用済みのリンクはアクセス不可

### サーバー管理
- サーバーの登録（Bot トークン・Webhook・ロール ID 等の設定）
- サーバーごとの認証設定（VPN ブロック ON/OFF 等）
- 通知チャネルの設定（Discord Webhook / Telegram Bot）

#### Discord Bot
- REST API のみ（永続接続なし）
- Go API から Bot トークンで Discord REST API を直接呼び出す
- 用途: ロール付与のみ（MVP）

### ログ閲覧
- サーバー別・組織横断での認証ログ一覧
- ユーザー検索（Discord ID / IP / 国 等でフィルタ）
- ログ詳細表示

### サーバー登録フロー

システムユーザーがダッシュボードでサーバーを登録する際に入力する情報:

| 項目 | 説明 |
|---|---|
| Discord Guild ID | 対象サーバーの ID |
| Discord Client ID | OAuth2 アプリの Client ID |
| Discord Client Secret | OAuth2 アプリの Client Secret |
| Discord Bot Token | ロール付与用 Bot のトークン |
| Discord Role ID | 認証後に付与するロール |
| Discord Webhook URL | ログ通知先 Webhook |

登録後、Loggify が内部 UUID を生成し、以下の redirect_uri をシステムユーザーに発行する:

```
https://loggify.com/api/callback/[server-uuid]
```

システムユーザーはこの URI を自前の Discord OAuth2 アプリに登録し、
認証 URL を Discord サーバーに貼る。

### 認証フロー（マルチテナント）

```
[Discord サーバーに貼る OAuth2 URL]
https://discord.com/oauth2/authorize
  ?client_id=[their-client-id]
  &redirect_uri=https://loggify.com/api/callback/[server-uuid]
  &scope=identify+email
  &response_type=code

↓ ユーザーが Discord で認証

GET /api/callback/[server-uuid]?code=...
  → server-uuid からサーバー設定を取得
  → code を当該サーバーの Client ID/Secret でトークン交換
    （Discord が client_id と code の対応を検証するため、
      UUID の改ざんはトークン交換失敗として弾かれる）
  → /verify/[server-uuid] にリダイレクト

GET /verify/[server-uuid]
  → GPS・画面サイズ・ブラウザ指紋収集 + Turnstile CAPTCHA

POST /api/verify
  → VPN チェック・ログ保存・ロール付与・Webhook 送信
  → /result/[status] にリダイレクト
```

---

## 通知チャネル

| チャネル | 優先度 |
|---|---|
| Discord Webhook | MVP |
| Telegram Bot | Post-MVP |

チャネルはサーバー設定ごとに有効/無効を切り替えられる。

---

## TODO

- **RBAC 詳細設計**: 固定3ロール `owner`（1人のみ）/ `admin` / `viewer` のパーミッションマトリクス・実装方針
- **ダッシュボード画面構成**: ワイヤーフレーム・ページ設計
- **セッション管理**: JWT 有効期限とリフレッシュ戦略（refresh token を使うか再ログインか）、Passkey と Discord OAuth2 のセッション統合方法
- **サーバー登録フローの詳細**: Bot 招待の誘導 UI の有無、Turnstile サイトキー・シークレットキーをサーバーごとに持つか Loggify 共通にするか
- **ログの保持期間・削除ポリシー**: 永久保存か期限付きか、サーバー削除時のログ扱い（カスケード削除 or 保留）
- **VPN ブロックの設定粒度**: ASN リストのカスタマイズ可否（特定 ASN を許可リストに追加するなど）
- **招待リンクの仕様詳細**: 有効期限の選択肢（具体的な値）、同時に発行できるリンク数の上限
- **Webhook / 通知の設計**: ログごとに即時送信かバッチか、送信失敗時のリトライ・エラーハンドリング
- **フロントエンド ↔ API 間の通信**: REST か GraphQL か、認証トークンの受け渡し方法（Cookie vs Authorization ヘッダー）、CORS 設定
- **マルチテナントのデータ分離**: PostgreSQL の Row-Level Security を使うかアプリ層でフィルタするか
- **エラー・結果画面**: `/result/[status]` をマルチテナントで流用するか、サーバーごとのカスタムメッセージ設定の有無
- **レート制限・スパム対策**: 同一 IP・同一 Discord ID による連続認証の制限方針
- **組織・サーバーの上限**: システムユーザーが作れる組織数の上限、1組織に登録できるサーバー数の上限
