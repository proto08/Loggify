# 03. API 仕様

## 1. 共通仕様

| 項目 | 仕様 |
|---|---|
| ベース URL | `https://api.loggify.com/v1` |
| バージョニング | URL プレフィックス `/v1`。互換性のない変更時に `/v2` |
| 形式 | JSON（`Content-Type: application/json`）、UTF-8 |
| 命名 | JSON のキーは `snake_case`、ID は UUID 文字列。Discord の ID（snowflake）は **文字列** で返す（JS の数値精度対策） |
| 日時 | RFC 3339（UTC）例: `2026-09-24T12:00:00Z` |
| 認証 | Cookie `lgf_at`（アクセストークン）。詳細は 05 |
| CSRF | 状態を変更するメソッド（POST/PUT/PATCH/DELETE）では `Origin` が許可リストに含まれることを必須とする。加えてヘッダー `X-Loggify-Client: web` を必須とする |
| CORS | `Access-Control-Allow-Origin: https://loggify.com`（開発時は `http://localhost:3000`）、`Allow-Credentials: true` |
| バリデーション | Gin の binding（go-playground/validator）。エラーは `validation_failed` で返す |

### 1.1 エラーレスポンス

```json
{
  "error": {
    "code": "validation_failed",
    "message": "入力内容に誤りがあります",
    "details": [{ "field": "name", "reason": "max" }]
  }
}
```

| HTTP | code | 用途 |
|---|---|---|
| 400 | `bad_request` / `validation_failed` | 形式・値の誤り |
| 401 | `unauthenticated` / `token_expired` | 未ログイン・アクセストークン期限切れ（フロントは refresh して再試行） |
| 403 | `forbidden` / `csrf_rejected` | 権限不足・CSRF 検査失敗 |
| 404 | `not_found` | 存在しない、または**権限のない組織のリソース**（存在を秘匿する） |
| 409 | `conflict` / `limit_exceeded` | 一意制約違反・上限超過 |
| 422 | `discord_check_failed` など | 外部サービスでの検証失敗 |
| 429 | `rate_limited` | レート制限（`Retry-After` ヘッダー付き） |
| 500 | `internal` | その他 |

### 1.2 ページネーション

- 認証ログ・監査ログ: **cursor 方式**。`?limit=50&cursor=...` → `{ "items": [...], "next_cursor": "..." | null }`。cursor は `(created_at, id)` を base64 化したもの
- それ以外（件数が少ない一覧）: ページネーションなし

### 1.3 認可の表記

以下の表の「権限」列の意味:

- `public`: 認証不要
- `login`: ログイン済み
- `viewer` / `admin` / `owner`: 対象組織でそのロール以上
- `sysadmin`: システム管理者

## 2. エンドポイント一覧

### 2.1 システムユーザー認証 `/auth`

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/auth/discord/login?next=` | public | state を Cookie に保存し、Discord 認可画面へ 302 |
| GET | `/auth/discord/callback` | public | code を交換 → ユーザーを作成または更新 → Cookie 発行 → `next` へ 302 |
| POST | `/auth/passkey/login/begin` | public | WebAuthn のチャレンジを発行 |
| POST | `/auth/passkey/login/finish` | public | 検証 → Cookie 発行 |
| POST | `/auth/refresh` | public（refresh Cookie 必須） | トークンをローテーション |
| POST | `/auth/logout` | login | 現在のセッションを失効させる |

### 2.2 アカウント `/me`

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/me` | login | プロフィール・所属組織とロールの一覧 |
| DELETE | `/me` | login | アカウント削除（所有する組織がある場合は 409。先に移譲または削除が必要） |
| GET | `/me/sessions` | login | ログイン中のセッション一覧 |
| DELETE | `/me/sessions/{session_id}` | login | 個別ログアウト |
| DELETE | `/me/sessions` | login | 全端末ログアウト |
| POST | `/me/passkeys/register/begin` | login | Passkey 登録を開始（ログインから 10 分以内であること） |
| POST | `/me/passkeys/register/finish` | login | Passkey 登録を完了 |
| GET | `/me/passkeys` | login | 登録済み Passkey の一覧 |
| PATCH / DELETE | `/me/passkeys/{id}` | login | 名前の変更・削除 |

### 2.3 組織 `/orgs`

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/orgs` | login | 所属組織の一覧 |
| POST | `/orgs` | login | 作成（所有数の上限を超えると 409 `limit_exceeded`） |
| GET | `/orgs/{org_id}` | viewer | 詳細 |
| PATCH | `/orgs/{org_id}` | admin | 名前の変更 |
| DELETE | `/orgs/{org_id}` | owner | 削除（本文に組織名を入れて確認。配下のサーバーは論理削除） |
| GET | `/orgs/{org_id}/stats?from=&to=` | viewer | 概要画面用の集計 |
| POST | `/orgs/{org_id}/transfer-ownership` | owner | `{ "system_user_id" }` へ移譲。元の owner は admin になる |

### 2.4 メンバー・招待

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/orgs/{org_id}/members` | viewer | メンバー一覧 |
| PATCH | `/orgs/{org_id}/members/{user_id}` | admin | ロールの変更（05 の RBAC 制約に従う） |
| DELETE | `/orgs/{org_id}/members/{user_id}` | admin（本人なら viewer） | 除外・脱退（owner は不可） |
| GET | `/orgs/{org_id}/invites` | admin | 未使用かつ有効な招待の一覧 |
| POST | `/orgs/{org_id}/invites` | admin | `{ "role": "admin" \| "viewer", "expires_in": "1h" \| "24h" \| "7d" }` → `{ "url" }`（トークンはこのレスポンスでのみ返す） |
| DELETE | `/orgs/{org_id}/invites/{invite_id}` | admin | 取り消し |
| GET | `/invites/{token}` | public | 組織名・ロール・有効期限（無効なら 404） |
| POST | `/invites/{token}/accept` | login | 受諾（既に所属していれば 409） |

### 2.5 サーバー

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/orgs/{org_id}/servers` | viewer | 一覧 |
| POST | `/orgs/{org_id}/servers` | admin | 下書きとして作成 `{ guild_id, name }` |
| GET | `/servers/{server_id}` | viewer | 詳細（秘密値は `has_client_secret: true` のように有無のみ返す） |
| PATCH | `/servers/{server_id}` | admin | 名前・認証設定・Role ID |
| PUT | `/servers/{server_id}/credentials` | admin | `{ client_id?, client_secret?, bot_token? }`（指定したものだけ更新） |
| POST | `/servers/{server_id}/check` | admin | Bot のギルド参加・ロール階層・OAuth 資格情報を検証し、問題なければ `status = active` にする |
| GET | `/servers/{server_id}/bot-invite-url` | admin | Bot 招待 URL |
| DELETE | `/servers/{server_id}` | admin | 論理削除 |
| GET | `/servers/{server_id}/notification-channels` | viewer | 一覧 |
| POST | `/servers/{server_id}/notification-channels` | admin | `{ type: "discord_webhook", config: { url } }` |
| PATCH / DELETE | `/servers/{server_id}/notification-channels/{id}` | admin | 有効/無効の切り替え・削除 |
| POST | `/servers/{server_id}/notification-channels/{id}/test` | admin | テスト送信 |

### 2.6 ASN ルール

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/asn/default` | login | デフォルトリスト（ASN・名前） |
| GET | `/orgs/{org_id}/asn-rules` | viewer | 組織ルール |
| PUT | `/orgs/{org_id}/asn-rules` | admin | 一括置換 `{ rules: [{ asn, action: "allow"\|"block", note }] }` |
| GET | `/servers/{server_id}/asn-rules` | viewer | サーバールール |
| PUT | `/servers/{server_id}/asn-rules` | admin | 一括置換 |
| GET | `/servers/{server_id}/asn-rules/effective?asn=` | viewer | 実効判定のプレビュー（どのレイヤーで決まったかを返す） |

### 2.7 認証ログ

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/orgs/{org_id}/logs` | viewer | 一覧。クエリ: `server_id, result, discord_id, ip, country, from, to, cursor, limit` |
| GET | `/logs/{log_id}` | viewer | 詳細（所属組織のログのみ） |
| POST | `/orgs/{org_id}/data-erasures` | admin | `{ discord_id, reason }` → 組織内の当該ユーザーのログを完全に削除 |
| GET | `/orgs/{org_id}/audit-logs` | admin | 監査ログ（cursor 方式） |

`GET /orgs/{org_id}/logs` の 1 件分のレスポンス:

```json
{
  "id": "0192...",
  "server": { "id": "…", "name": "My Server" },
  "discord_user": { "id": "123456789012345678", "username": "alice", "global_name": "Alice", "avatar_url": "…" },
  "result": "success",
  "ip": "203.0.113.5",
  "country": "JP",
  "city": "Tokyo",
  "asn": 2516,
  "asn_decision": { "action": "allow", "layer": "default" },
  "pii_purged": false,
  "created_at": "2026-09-24T12:00:00Z"
}
```

詳細 API（`GET /logs/{log_id}`）はこれに加えて `isp, region, latitude, longitude, geo_address, screen, user_agent, fingerprint_hash, email, consent_version, notify_status` を返す。
保存期間を過ぎたログは `pii_purged: true` になり、これらのフィールドは `null` になる。

### 2.8 認証フロー（エンドユーザー向け）

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/public/servers/{server_id}` | public | `{ name, icon_url, status, collect_gps, collect_email, consent_version }`（`/v` と `/result` の表示用） |
| GET | `/verify/{server_id}/start?consent={version}` | public | 認証セッションを作成し Cookie `lgf_vs` を発行 → Discord 認可画面へ 302 |
| GET | `/verify/{server_id}/callback?code=&state=` | public | state を検証 → code を交換 → Discord ユーザーを取得 → ユーザートークンを破棄 → `/verify/{server_id}` へ 302 |
| GET | `/verify/{server_id}/session` | public（`lgf_vs` 必須） | `{ discord_user: { username, avatar_url }, collect_gps, turnstile_site_key, expires_at }` |
| POST | `/verify/{server_id}/complete` | public（`lgf_vs` 必須） | 下記 |

`POST /verify/{server_id}/complete` のリクエスト:

```json
{
  "turnstile_token": "…",
  "location": { "latitude": 35.68, "longitude": 139.76, "accuracy": 30 },
  "screen": { "width": 1920, "height": 1080 },
  "fingerprint": { "visitor_id": "…", "canvas_hash": "…" }
}
```

- `location` は GPS を収集しない場合、または拒否された場合は `null`
- レスポンスは常に `200 { "status": "success" | "vpn" | "captcha" | "declined" | "expired" | "unavailable" | "rate_limited" | "error" }`。フロントはこれを `/result/{server_id}/{status}` に使う
- 処理の順序と失敗時の扱いは 05 §5 を参照

### 2.9 システム管理 `/admin`

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| PUT | `/admin/asn/default` | sysadmin | デフォルトリストの一括置換 |
| GET | `/admin/orgs` | sysadmin | 全組織の一覧 |
| POST | `/admin/servers/{id}/suspend` | sysadmin | 強制停止 |
| GET | `/admin/orgs/{org_id}/logs` | sysadmin | 閲覧（監査ログに `sysadmin.logs.read` を記録） |

### 2.10 その他

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/health` | 死活監視用（ルート直下、`/v1` なし。既存実装どおり） |
| GET | `/ready` | DB に接続できるかを確認 |

## 3. レート制限

MVP はプロセス内メモリ（トークンバケット）で実装する。レプリカを複数にする段階で Redis などに移す（インフラ設計で扱う）。

| 対象 | キー | 制限（初期値） |
|---|---|---|
| `/verify/*/start` | IP | 10 回 / 10 分 |
| `/verify/*/complete` | IP | 10 回 / 10 分 |
| `/verify/*/complete` | server_id + Discord ID | 5 回 / 10 分 |
| `/auth/*` | IP | 30 回 / 10 分 |
| ログイン済み API | system_user_id | 300 回 / 分 |

## 4. クライアント IP の決定

- Container Apps などのリバースプロキシの後ろで動くため、`X-Forwarded-For` を使う
- Gin の `SetTrustedProxies` に信頼するプロキシの範囲だけを設定し、`c.ClientIP()` の値を採用する。ヘッダーの先頭要素をそのまま信用しない
- Cloudflare を前段に置く場合は `CF-Connecting-IP` を優先する（インフラ設計で確定）
