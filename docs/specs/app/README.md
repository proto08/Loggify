# Loggify — アプリケーション設計

`docs/specs/draft-idea.md`（仕様ドラフト）と `docs/todo.md`（未決事項一覧）をもとに、マルチテナント版 Loggify のアプリケーション設計をまとめる。
インフラ設計は `docs/specs/infra/` で別途扱う。

## ドキュメント構成

| # | ファイル | 内容 |
|---|---|---|
| 01 | [01-overview.md](./01-overview.md) | スコープ・アクター・機能一覧・MVP 範囲・システム構成 |
| 02 | [02-screens.md](./02-screens.md) | 画面一覧・画面遷移 |
| 03 | [03-api.md](./03-api.md) | REST API 仕様（FastAPI が持つ API。Better Auth 側の API は 05 参照） |
| 04 | [04-data-model.md](./04-data-model.md) | データモデル（PostgreSQL、`auth` / `app` スキーマ） |
| 05 | [05-auth-session.md](./05-auth-session.md) | BFF 構成・Better Auth・JWT 連携・RBAC・エンドユーザー認証フロー |
| 06 | [06-privacy.md](./06-privacy.md) | 個人データの同意・保存期間・アクセス権 |

## 設計上の前提

- **BFF 構成**: ブラウザは Next.js（`loggify.com`）とだけ通信する。FastAPI は Next.js のサーバー側からのみ呼ばれ、インターネットに公開しない（Azure Container Apps、内部 ingress）
- フロントエンド / BFF: Next.js（App Router）+ **Better Auth**。システムユーザーの認証・セッション・組織/メンバー/招待の基盤データを持つ
- バックエンド: FastAPI（Python）+ SQLAlchemy 2.x + Alembic。サーバー・認証ログ・ASN ルールなど、アプリ固有の業務データを持つ
- DB: PostgreSQL 1 台。**`auth` スキーマ**（Better Auth 所有、Better Auth 自身のツールでマイグレーション）と **`app` スキーマ**（FastAPI 所有、Alembic でマイグレーション）に分離。物理外部キーでは繋がない（04 参照）
- FastAPI と `auth` スキーマの橋渡しは **Better Auth の JWT プラグイン + JWKS**。FastAPI は `auth` スキーマを直接読まない
- ログイン方法: Discord OAuth2 + Microsoft(Entra ID) OAuth2。Passkey はログイン後の追加登録のみ（Passkey 単体でのログイン・新規登録は不可）
- デプロイ先: Azure Container Apps（既存 `infra/` の構成を踏襲）
- シークレット（DB 接続情報・暗号鍵など）は Key Vault 等から環境変数で注入（詳細はインフラ設計）

## ドラフトから変更・具体化した点

| 項目 | ドラフト | 本設計 | 理由 |
|---|---|---|---|
| バックエンド言語 | 未定（Go の雛形あり） | FastAPI（Python） | ユーザー指定 |
| 認証開始 URL | Discord の authorize URL を直接貼る | Loggify の開始 URL `https://loggify.com/v/{server_id}` を貼る | OAuth `state` による CSRF 対策、Discord 遷移前の同意画面表示のため |
| redirect_uri（エンドユーザー） | `https://loggify.com/api/callback/{uuid}` | `https://loggify.com/api/verify/{server_id}/callback` | Next.js の Route Handler で受け、検証は FastAPI に任せる |
| VPN チェックの位置 | コールバック時 | 認証完了（`complete`）時 | 実際に認証を送信した IP で判定するため |
| OAuth scope（エンドユーザー） | `identify email` | `identify` のみ（email はサーバー設定で任意に ON） | データ最小化 |
| ログの保存期間 | 永久保存 | 詳細な個人データは保存期間（既定 90 日）後に消去し、要約レコードのみ残す | 06-privacy.md 参照 |
| サーバー削除時のログ | 紐付けを切って保持 | サーバーを論理削除し、30 日後にログを物理削除 | 孤立データを作らない。30 日は誤操作から復旧できる期間 |
| システムユーザーの認証基盤 | 自前の JWT + Refresh | **Better Auth**（Next.js 側、`auth` スキーマ）。FastAPI へは Better Auth の JWT プラグインで都度短命 JWT を発行して連携 | Discord・Microsoft・Passkey・組織/招待の実装を持つ既製品に乗る。JWT は非対称鍵署名で FastAPI に秘密を渡さずに検証できる |
| ログイン方法 | Discord のみ | Discord + Microsoft(Entra ID) | ユーザー指定 |
| 組織・メンバー・招待の実体 | 自前テーブル（`organizations`/`org_members`/`org_invites`） | 組織・メンバーは **Better Auth の organization プラグイン**（`auth` スキーマ）。招待だけは要件（誰でも踏める 1 回限り URL）が合わないため自前実装 | 05 §6 参照 |
| マルチテナント分離 | アプリ層フィルタのみ | アプリ層フィルタ + **`app` スキーマに RLS** | アプリのバグによる他組織データの漏えいを DB 側でも防ぐ |
| 通知先 | サーバー設定に Webhook URL を持つ | `notification_channels` テーブルに分離 | Telegram 追加時にスキーマ変更が不要 |
| Discord ユーザートークン（エンドユーザー） | 現行実装は refresh_token を Webhook に送信 | **保存も送信もしない**。ロール付与が済んだら破棄 | 第三者のアカウントを操作できるトークンのため |
| Next.js → FastAPI の認証確認 | （未検討） | Better Auth の **JWT + JWKS**。リクエストごとに `org_id`・`role` を含めて都度発行（有効期限 30 秒） | 共有シークレットの配布・ローテーションが不要。複数組織所属でも情報が古くならない |
| CAPTCHA | Cloudflare Turnstile | **hCaptcha** | ユーザー指定 |
| サイト前段の保護 | なし | **Cloudflare（プロキシ有効、WAF・Under Attack Mode 常時 ON）**を追加。クライアント IP は `CF-Connecting-IP` を使用 | ユーザー指定。DDoS/ボット対策をアプリ層(hCaptcha)とは別に、エッジ層でも行う |

## 決定待ち事項

| # | 事項 | 状態 | 記載箇所 |
|---|---|---|---|
| D1 | 詳細個人データの保存期間の既定値と上限 | **対象外**（別途対応。本設計では扱わない） | — |
| D14 | フィンガープリント収集コードの難読化 | **保留**。Cloudflare Bot Fight Mode / Super Bot Fight Mode は Under Attack Mode 常時 ON で足りると判断し不採用 | — |

## 確定事項（個人データ・運用まわり）

D1 を除き、以下はすべて確定済み。

| # | 事項 | 確定内容 | 記載箇所 |
|---|---|---|---|
| D2 | GPS 収集のデフォルト | `optional`（既定で収集を試みるが、拒否されても認証は継続） | 05, 06 |
| D3 | ブラウザフィンガープリントの保存形式 | 複数要素（audio・fonts・hardwareConcurrency 等）を合成したハッシュに加え、**生の値**（webgl_renderer・webgl_vendor・canvas_hash）も保存する | 04, 06 |
| D4 | ASN ルールの優先順位 | 具体的なスコープのルールが優先（サーバー > 組織 > デフォルト） | 05 |
| D5 | デフォルト ASN リストの更新反映 | 常に最新を参照（スナップショットは取らない） | 05 |
| D6 | 同一 Guild ID の重複登録 | 有効なサーバー間で一意（別組織からの二重登録は不可） | 04 |
| D7 | システム管理者によるログ閲覧 | 閲覧可能だが、すべて監査ログに記録 | 05, 06 |
| D8 | 通知（Webhook）に載せる内容 | 認証結果・国・VPN 判定・Discord ユーザー情報・メールアドレス（収集時）・ダッシュボードへのリンクのみ。IP・GPS・住所・UA・フィンガープリントは含めない（現行実装から変更） | 05, 06 |
| D9 | admin が発行できる招待のロール | viewer のみ（admin は自分と同じロールを招待できない。admin の招待は owner だけ） | 05 |
| D11 | `app` スキーマの RLS 導入 | 導入する（`org_id` ベース、sysadmin は `BYPASSRLS` ロールで迂回） | 04, 05 |
| D12 | 招待の受諾方式 | Better Auth 標準（メール一致必須）は使わず、自前実装（トークン URL・誰でも踏める・1 回限り） | 05 |
| D13 | JWT ペイロードの中身 | `sub`（system_user_id）・`org_id`・`role`。`requireOrgMember` の結果をそのまま都度詰める | 05 |
| D15 | `notification_channels` への RLS 適用 | `org_id` を非正規化して追加し、RLS 対象に含める（`asn_rules` と同じ扱い） | 04 |
| D16 | 組織・メンバー系操作の監査ログ | `POST /v1/audit-logs` を新設し、Next.js が `auth` スキーマ側の操作を記録する | 03, 04 |

## レビューで見つけた修正（設計内の不整合）

一通り書き上げた後にレビューを行い、以下を修正した。

| 項目 | 内容 |
|---|---|
| フィンガープリントのAPI仕様 | `POST /verify/{id}/complete` のリクエスト例が D3 決定前のまま（`visitor_id`/`canvas_hash` のみ）だったため、audio・fonts・hardwareConcurrency 等の合成ハッシュ材料と、生データ 3 項目を送る形に修正 |
| 生フィンガープリントの公開範囲 | ログ詳細 API では返さない（名寄せ判定にのみ内部で使う）ことを明記 |
| IDOR 対策の明記漏れ | Better Auth 導入に伴う 05 の全面書き直しで欠落していた「repository は `org_id` と リソース ID を必ず両方で絞る」という原則を再掲 |
| CSRF 対策の明記漏れ | 同じく書き直しで欠落していた CSRF 対策（Better Auth の `trustedOrigins` + Server Actions の Origin 検査）を再掲 |
| Better Auth 自身のレート制限 | Discord/Microsoft OAuth・Passkey ログインへのレート制限が未記載だったため追加 |
| `require_service` という紛らわしい命名 | 実体は JWT 署名検証であり「サービストークン」ではないため `verify_jwt` に変更 |
| サーバー登録数の上限 | 機能一覧（01）にしか書かれておらず API 仕様に出てこなかったため、`POST /orgs/{org_id}/servers` に明記 |
| オーナー移譲の実装方法 | 招待と同様「Better Auth 標準にない操作なので `auth.member` を直接更新する」ことを明記 |

## docs/todo.md との対応

本設計で方針を定めた項目: 1.1〜1.5（一部）, 2, 3, 4, 5（パーティショニング・バックアップ以外）, 6, 7, 8（画面構成）, 9, 12（方針のみ）, 14（移行方針）。
インフラ（10）、課金（11）、法務文書の本文（12）は対象外。
