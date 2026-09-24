# Loggify — アプリケーション設計

`docs/specs/draft-idea.md`（仕様ドラフト）と `docs/todo.md`（未決事項一覧）をもとに、マルチテナント版 Loggify のアプリケーション設計をまとめる。
インフラ設計は `docs/specs/infra/` で別途扱う。

## ドキュメント構成

| # | ファイル | 内容 |
|---|---|---|
| 01 | [01-overview.md](./01-overview.md) | スコープ・アクター・機能一覧・MVP 範囲・システム構成 |
| 02 | [02-screens.md](./02-screens.md) | 画面一覧・画面遷移 |
| 03 | [03-api.md](./03-api.md) | REST API 仕様（frontend ↔ backend） |
| 04 | [04-data-model.md](./04-data-model.md) | データモデル（PostgreSQL） |
| 05 | [05-auth-session.md](./05-auth-session.md) | BFF とサービス認証・システムユーザー認証・セッション・RBAC・エンドユーザー認証フロー |
| 06 | [06-privacy.md](./06-privacy.md) | 個人データの同意・保存期間・アクセス権 |

## 設計上の前提

- **BFF 構成**: ブラウザは Next.js（`loggify.com`）とだけ通信する。FastAPI は Next.js のサーバー側からのみ呼ばれ、インターネットに公開しない
- フロントエンド / BFF: Next.js（App Router）。画面・Cookie 管理・FastAPI 呼び出しを担当し、業務ロジックと外部サービスのシークレットは持たない
- バックエンド: FastAPI（Python）+ SQLAlchemy 2.x + Alembic
- DB: PostgreSQL
- シークレット（DB 接続情報・暗号鍵など）は Key Vault 等から環境変数で注入（詳細はインフラ設計）

## ドラフトから変更・具体化した点

| 項目 | ドラフト | 本設計 | 理由 |
|---|---|---|---|
| 認証開始 URL | Discord の authorize URL を直接貼る | Loggify の開始 URL `https://loggify.com/v/{server_id}` を貼る | OAuth `state` による CSRF 対策、Discord 遷移前の同意画面表示のため |
| redirect_uri | `https://loggify.com/api/callback/{uuid}` | `https://loggify.com/api/verify/{server_id}/callback` | Next.js の Route Handler で受け、検証は FastAPI に任せる |
| VPN チェックの位置 | コールバック時 | 認証完了（`complete`）時 | 実際に認証を送信した IP で判定するため |
| OAuth scope | `identify email` | `identify` のみ（email はサーバー設定で任意に ON） | データ最小化 |
| ログの保存期間 | 永久保存 | 詳細な個人データは保存期間（既定 90 日）後に消去し、要約レコードのみ残す | 06-privacy.md 参照 |
| サーバー削除時のログ | 紐付けを切って保持 | サーバーを論理削除し、30 日後にログを物理削除 | 孤立データを作らない。30 日は誤操作から復旧できる期間 |
| システムユーザーのセッション | JWT（Access + Refresh） | サーバー側で管理する不透明トークン 1 本（Cookie は Next.js が保持） | BFF 構成ではブラウザが API を直接呼ばないため、JWT とリフレッシュの仕組みが不要 |
| 通知先 | サーバー設定に Webhook URL を持つ | `notification_channels` テーブルに分離 | Telegram 追加時にスキーマ変更が不要 |
| Discord ユーザートークン | 現行実装は refresh_token を Webhook に送信 | **保存も送信もしない**。ロール付与が済んだら破棄 | 第三者のアカウントを操作できるトークンのため |

## 決定待ち事項

本設計では推奨案で仮置きしている。確定したら各ドキュメントに反映する。

| # | 事項 | 推奨案 | 記載箇所 |
|---|---|---|---|
| D1 | 詳細個人データの保存期間の既定値と上限 | 既定 90 日、サーバー設定で 7〜365 日 | 06 |
| D2 | GPS 収集を続けるか | サーバー設定で `off` / `optional` / `required`（既定 `off`） | 05, 06 |
| D3 | ブラウザフィンガープリントの保存形式 | `visitorId` などのハッシュのみ保存。WebGL レンダラー文字列は保存しない | 04, 06 |
| D4 | ASN ルールの優先順位 | 具体的なスコープのルールが優先（サーバー > 組織 > デフォルト） | 05 |
| D5 | デフォルト ASN リストの更新反映 | 常に最新を参照（スナップショットは取らない） | 05 |
| D6 | 同一 Guild ID の重複登録 | 有効なサーバー間で一意（別組織からの二重登録は不可） | 04 |
| D7 | システム管理者によるログ閲覧 | 閲覧可能だが、すべて監査ログに記録 | 05, 06 |
| D8 | 通知（Webhook）に載せる内容 | 要約とダッシュボードへのリンクのみ。IP・GPS・住所は載せない（現行実装から変更） | 05, 06 |
| D9 | admin が発行できる招待のロール | viewer のみ（admin の招待は owner だけ。ドラフトでは admin も admin を招待できた） | 05 |
| D10 | Next.js → FastAPI のサービス認証 | Entra ID のクライアント資格情報（Managed Identity + app role）。代替は共有シークレット | 05 |

## docs/todo.md との対応

本設計で方針を定めた項目: 1.1〜1.5（一部）, 2, 3, 4, 5（パーティショニング・バックアップ以外）, 6, 7, 8（画面構成）, 9, 12（方針のみ）, 14（移行方針）。
インフラ（10）、課金（11）、法務文書の本文（12）は対象外。
