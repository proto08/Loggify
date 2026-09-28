# 01. 概要・機能一覧

## 1. 目的

Discord サーバーの参加者を認証（CAPTCHA・VPN 判定・ロール付与）し、その記録をサーバー管理者がダッシュボードで確認できるマルチテナント SaaS にする。

## 2. アクター

| アクター | 説明 | 本システムのアカウント |
|---|---|---|
| エンドユーザー | Discord サーバーに参加し、認証フローを通る人 | なし（Discord ID で識別） |
| システムユーザー | ダッシュボードを使ってサーバーを管理する人 | あり |
| 組織ロール | システムユーザーが組織内で持つ権限: `owner` / `admin` / `viewer` | — |
| システム管理者 | Loggify の運営者（`app.sysadmins` に登録された `system_user_id`） | あり |

## 3. 用語

| 用語 | 定義 |
|---|---|
| 組織 (Organization) | サーバーとメンバーを束ねる単位。データ分離の境界 |
| サーバー (Server) | Loggify に登録された Discord ギルド。`server_id`（UUID）で識別 |
| 認証セッション (Verification Session) | Discord ログインから認証完了までの一時的な状態（有効期限 10 分） |
| 認証ログ (Verification Log) | 認証試行 1 回分の記録 |
| 詳細個人データ | IP・位置・UA・画面サイズ・フィンガープリントなど、保存期間後に消去するフィールド群 |

## 4. システム構成

```
                 ┌─────────── loggify.com（公開） ───────────┐
Browser ─Cookie─▶│ Next.js = BFF + Better Auth                 │
                 │  Server Components / Server Actions /       │
                 │  Route Handlers（OAuth のリダイレクトのみ） │
                 └─────────────────────────────────────────────┘
                        │ Authorization: Bearer <JWT>（都度発行）
                        ▼
                 ┌──────── FastAPI（内部 ingress のみ） ───────┐      ┌── Discord API (OAuth2 / Bot)
                 │ routers → services → repositories           │─────▶├── Cloudflare Turnstile
                 └─────────────────────────────────────────────┘      ├── ipinfo.io
                        │                                              ├── gps-coordinates.net
                        ▼                                              └── Discord Webhook / Telegram
              PostgreSQL（auth スキーマ / app スキーマ）
```

### 4.1 役割分担

| 層 | 持つもの | 持たないもの |
|---|---|---|
| Next.js（BFF + Better Auth） | 画面、システムユーザーの認証・セッション・組織/メンバー/招待の基盤データ（`auth` スキーマ）、FastAPI 呼び出しの集約、入力の一次検証（zod） | 業務ロジック（サーバー・ログ・ASN ルール等）、外部サービスのシークレット（Discord・Turnstile のシークレットキーなど） |
| FastAPI | 業務ロジック、`app` スキーマ、外部サービスの呼び出し、定期ジョブ、JWT の検証（署名検証のみ、`auth` スキーマには触れない） | 画面、システムユーザーのアカウント情報そのもの |

- ブラウザが通信するのは Next.js だけ。FastAPI はインターネットに公開しない
- ブラウザで必要な公開値（Turnstile のサイトキー）は、FastAPI から取得して画面に埋め込む
- Next.js と FastAPI の連携方式（Better Auth の JWT + JWKS）、認証データの分離理由は 05 を参照

### 4.2 FastAPI のディレクトリ構成

```
backend/
  app/
    main.py            # FastAPI アプリの生成、ルーター登録、例外ハンドラー
    core/              # 設定（pydantic-settings）、暗号化、ログ
    deps/              # Depends 用: サービス認証、current_user、org_role、DB セッション
    routers/           # HTTP の入出力のみ（auth, me, orgs, servers, logs, verify, admin, public）
    schemas/           # Pydantic のリクエスト/レスポンス
    services/          # 業務ロジック
    repositories/      # DB アクセス（org_id を必須引数にする）
    models/            # SQLAlchemy のモデル
    clients/           # 外部 API: discord, turnstile, ipinfo, geocode, notify
    jobs/              # 定期ジョブ（python -m app.jobs <name>）
  migrations/          # Alembic
  tests/
  pyproject.toml       # uv で管理
```

既存の `backend/`（Go の雛形）はこの構成で置き換える。

## 5. 機能一覧

MVP の列: ◎ = MVP に含める、○ = MVP 直後に着手、— = 後回し

### 5.1 エンドユーザー向け（認証フロー）

| ID | 機能 | MVP |
|---|---|---|
| V-01 | 認証開始ページ（サーバー名・収集データの説明・同意） | ◎ |
| V-02 | Discord OAuth2 ログイン（サーバーごとの OAuth アプリ） | ◎ |
| V-03 | Turnstile CAPTCHA | ◎ |
| V-04 | 画面サイズ・UA・フィンガープリントの収集 | ◎ |
| V-05 | GPS 収集（サーバー設定に従う） | ◎ |
| V-06 | VPN/プロキシ判定（ASN、3 レイヤールール） | ◎ |
| V-07 | ロール付与（Bot REST API） | ◎ |
| V-08 | 結果画面（サーバー名・アイコン付き） | ◎ |
| V-09 | レート制限（IP・Discord ID） | ◎ |
| V-10 | 結果画面のカスタムメッセージ | — |

### 5.2 システムユーザー向け（ダッシュボード）

| ID | 機能 | MVP |
|---|---|---|
| A-01 | Discord / Microsoft(Entra ID) OAuth2 ログイン（Better Auth） | ◎ |
| A-02 | Passkey の登録とログイン（追加登録のみ、単体ログイン不可） | ○ |
| A-03 | セッション一覧・個別ログアウト・全端末ログアウト | ○ |
| A-04 | アカウント削除 | ◎ |
| O-01 | 組織の作成・編集・削除（作成は 1 人 1 つまで） | ◎ |
| O-02 | 招待リンク（1 回限り、1h/24h/7d） | ◎ |
| O-03 | メンバーのロール変更・除外・オーナー移譲 | ◎ |
| O-04 | 監査ログの閲覧 | ◎ |
| S-01 | サーバー登録ウィザード（資格情報入力 → Bot 参加確認 → 開始 URL 発行） | ◎ |
| S-02 | サーバー設定（有効/無効、VPN ブロック、GPS、保存期間、email 収集） | ◎ |
| S-03 | 資格情報の更新（Secret・Bot Token のローテーション） | ◎ |
| S-04 | 通知チャネル（Discord Webhook） | ◎ |
| S-05 | 通知チャネル（Telegram） | — |
| S-06 | Bot の参加状態チェック（手動 + 認証時に失敗を検知） | ◎ |
| L-01 | 認証ログ一覧（組織横断・サーバー別・フィルタ） | ◎ |
| L-02 | 認証ログ詳細 | ◎ |
| L-03 | Discord ID 指定での個人データ削除 | ◎ |
| L-04 | 統計サマリー（件数推移・国別・VPN ブロック率） | ○ |
| L-05 | CSV エクスポート | — |
| L-06 | リアルタイム表示（SSE） | — |
| R-01 | ASN ルール（組織・サーバー単位の許可/ブロック） | ◎ |

### 5.3 システム管理者向け

| ID | 機能 | MVP |
|---|---|---|
| X-01 | デフォルト ASN リストの管理 | ◎ |
| X-02 | 全組織・全サーバーの閲覧（監査ログに記録） | ○ |
| X-03 | 組織・サーバーの強制停止 | ○ |

## 6. 上限（プラン設計までの暫定値）

| 項目 | 上限 |
|---|---|
| 1 人が作成（所有）できる組織 | 1 |
| 1 人が所属できる組織 | 制限なし |
| 1 組織あたりのサーバー | 5 |
| 1 サーバーあたりの ASN ルール | 500 |
| 招待リンクの同時発行数 | 制限なし |

上限は `plan_limits` などに切り出さず、MVP では `config` の定数で持つ。課金設計のときにテーブル化する。

## 7. 非機能要件（アプリ側）

| 項目 | 目標 |
|---|---|
| 認証完了 API（`complete`）のレイテンシ | p95 3 秒以内（外部 API 呼び出しを含む） |
| ダッシュボード API のレイテンシ | p95 300ms 以内 |
| 外部 API タイムアウト | 各 5 秒。ipinfo・逆ジオコーディングが失敗しても認証は継続し、該当フィールドを空にする |
| 通知 | 同期送信・リトライなし。失敗はログの `notify_status` に記録 |
| アプリケーションログ | 構造化 JSON。IP・GPS・トークン・Discord ユーザー名は出力しない（ID のみ可） |
| 対応ブラウザ | 最新の Chrome / Safari / Firefox / Edge。認証ページはモバイル必須、ダッシュボードはデスクトップ優先（モバイルは閲覧のみ崩れなければ可） |
