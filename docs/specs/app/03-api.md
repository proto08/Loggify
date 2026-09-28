# 03. API 仕様（FastAPI）

本章は **FastAPI が持つ API**（`app` スキーマのデータを扱うもの）だけを定義する。
システムユーザーの認証・セッション・組織・メンバー・招待は **Better Auth（Next.js 側）が持つ**ため、ここには出てこない。招待だけ自前実装のため例外的に FastAPI 外（Next.js 側）に実装する（05 §6.3）。
Next.js と FastAPI の間の認証（JWT + JWKS）は 05 §3 を参照。

## 1. 共通仕様

| 項目 | 仕様 |
|---|---|
| ベース URL | `http://<backend の内部ホスト名>:8000/v1`（環境変数 `BACKEND_URL` で Next.js に渡す） |
| バージョニング | URL プレフィックス `/v1`。呼び出し元は Next.js だけなので、互換性のない変更は Next.js と同時にデプロイする |
| 形式 | JSON（`Content-Type: application/json`）、UTF-8 |
| 命名 | JSON のキーは `snake_case`、ID は UUID 文字列。Discord の ID（snowflake）は **文字列** で返す（JS の数値精度対策） |
| 日時 | RFC 3339（UTC）例: `2026-09-24T12:00:00Z` |
| 認証 | `Authorization: Bearer <JWT>`（Better Auth が発行。05 §3）。エンドユーザー向けは `X-Verification-Token` |
| スキーマ | Pydantic v2 のモデルで定義する。FastAPI が出力する OpenAPI から、Next.js 用の TypeScript 型を生成する（`openapi-typescript`） |
| OpenAPI の公開 | `/docs`・`/openapi.json` は開発環境のみ有効 |

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
| 400 | `bad_request` | 形式の誤り |
| 401 | `unauthenticated` | JWT が無効・期限切れ（Next.js は `requireOrgMember` からやり直す） |
| 403 | `forbidden` | sysadmin 専用 API など |
| 404 | `not_found` | 存在しない、または**権限のない組織のリソース**（存在を秘匿する） |
| 409 | `conflict` / `limit_exceeded` | 一意制約違反・上限超過 |
| 422 | `validation_failed` / `discord_check_failed` など | 入力値の誤り（FastAPI 標準の 422 を上記の形式に変換する）・外部サービスでの検証失敗 |
| 429 | `rate_limited` | レート制限（`Retry-After` ヘッダー付き） |
| 500 | `internal` | その他 |

### 1.2 ページネーション

- 認証ログ・監査ログ: **cursor 方式**。`?limit=50&cursor=...` → `{ "items": [...], "next_cursor": "..." | null }`。cursor は `(created_at, id)` を base64 化したもの
- それ以外（件数が少ない一覧）: ページネーションなし

### 1.3 認可の表記

- `public`: JWT 不要（`X-Verification-Token` または無認証）
- `viewer` / `admin` / `owner`: JWT の `role` クレームがそのロール以上
- `sysadmin`: JWT の `sub` が `app.sysadmins` に含まれる

## 2. エンドポイント一覧

### 2.1 組織(集計) `/orgs`

組織そのものの CRUD・メンバー・招待は Better Auth が持つ（05 参照）。ここにあるのは FastAPI 側データの集計のみ。

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/orgs/{org_id}/stats?from=&to=` | viewer | 概要画面用の集計（認証数推移・成功率・ブロック数など、`verification_logs` の集計） |

### 2.2 サーバー

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

### 2.3 ASN ルール

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/asn/default` | viewer | デフォルトリスト（ASN・名前） |
| GET | `/orgs/{org_id}/asn-rules` | viewer | 組織ルール |
| PUT | `/orgs/{org_id}/asn-rules` | admin | 一括置換 `{ rules: [{ asn, action: "allow"\|"block", note }] }` |
| GET | `/servers/{server_id}/asn-rules` | viewer | サーバールール |
| PUT | `/servers/{server_id}/asn-rules` | admin | 一括置換 |
| GET | `/servers/{server_id}/asn-rules/effective?asn=` | viewer | 実効判定のプレビュー（どのレイヤーで決まったかを返す） |

### 2.4 認証ログ

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

監査ログ(`GET /orgs/{org_id}/audit-logs`)の1件分は、`actor_id`（system_user_id、UUID）に加え、**書き込み時に非正規化した** `actor_username` を含む（当時の表示名。後から本人が改名しても変わらない。理由は 04 §3 参照）。

### 2.5 認証フロー（エンドユーザー向け）

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/public/servers/{server_id}` | public | `{ name, icon_url, status, collect_gps, collect_email, retention_days, consent_version }`（`/v` と `/result` の表示用） |
| POST | `/verify/{server_id}/start` | public | `{ consent_version }` → `{ authorize_url, verification_token, expires_at }`、または `{ status: "unavailable" \| "consent_outdated" \| "rate_limited" }` |
| POST | `/verify/{server_id}/callback` | `X-Verification-Token` | `{ code, state }` → `{ ok: true }` |
| GET | `/verify/{server_id}/session` | `X-Verification-Token` | `{ discord_user: { username, avatar_url }, collect_gps, turnstile_site_key, expires_at }` |
| POST | `/verify/{server_id}/complete` | `X-Verification-Token` | 下記 |

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
- 処理の順序と失敗時の扱いは 05 §10 を参照

### 2.6 システム管理 `/admin`

| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| PUT | `/admin/asn/default` | sysadmin | デフォルトリストの一括置換 |
| GET | `/admin/orgs` | sysadmin | 全組織の一覧（`app` スキーマ内の `servers`・`verification_logs` から集計。組織名の表示は Next.js 側で Better Auth に問い合わせて補う） |
| POST | `/admin/servers/{id}/suspend` | sysadmin | 強制停止 |
| GET | `/admin/orgs/{org_id}/logs` | sysadmin | 閲覧（監査ログに `sysadmin.logs.read` を記録） |

### 2.7 その他

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/health` | 死活監視用（ルート直下、`/v1` なし。認証不要） |
| GET | `/ready` | DB に接続できるかを確認（認証不要） |

## 3. レート制限

MVP はプロセス内メモリ（トークンバケット）で実装する。レプリカを複数にする段階で Redis などに移す（インフラ設計で扱う）。

| 対象 | キー | 制限（初期値） |
|---|---|---|
| `/verify/*/start` | IP | 10 回 / 10 分 |
| `/verify/*/complete` | IP | 10 回 / 10 分 |
| `/verify/*/complete` | server_id + Discord ID | 5 回 / 10 分 |
| ログイン済み API | system_user_id（JWT の `sub`） | 300 回 / 分 |

## 4. クライアント IP

FastAPI は `X-Client-IP` ヘッダーの値だけを使う（Next.js が設定する。05 §8）。レート制限・Turnstile の `remoteip`・ipinfo の照会・ログの `ip` はすべてこの値を使う。

## 5. Next.js 側のルート（ブラウザから見える入口）

画面（ページ）は 02 を参照。ここでは画面以外の入口をまとめる。

### 5.1 Better Auth 自身のルート

Better Auth が `app/api/auth/[...all]/route.ts` で自動的にマウントする。個別の実装は不要。

| パス | 役割 |
|---|---|
| `/api/auth/sign-in/social`（Discord/Microsoft） | OAuth 開始 |
| `/api/auth/callback/discord`, `/api/auth/callback/microsoft` | OAuth コールバック |
| `/api/auth/sign-in/passkey`, `/api/auth/passkey/add-passkey` | Passkey ログイン・登録 |
| `/api/auth/sign-out` | ログアウト |
| `/api/auth/token` | FastAPI 向け JWT の発行 |
| `/api/auth/jwks` | FastAPI が検証に使う公開鍵 |

### 5.2 このアプリ独自の Route Handlers

| メソッド | パス | 呼ぶ FastAPI | 役割 |
|---|---|---|---|
| GET | `/api/verify/[serverId]/start?consent=` | `POST /v1/verify/{id}/start` | `__Host-lgf_vs` を設定し、Discord へ 302 |
| GET | `/api/verify/[serverId]/callback` | `POST /v1/verify/{id}/callback` | `/verify/[serverId]` または `/result/...` へ 302 |
| GET / POST | `/invite/[token]`（招待の受諾。05 §6.3） | なし（`auth` スキーマへ直接アクセス） | ログイン確認 → 招待の検証 → `auth.member` へ INSERT |

Discord に登録する redirect_uri:

| 用途 | redirect_uri | 登録先 |
|---|---|---|
| システムユーザーのログイン | `https://loggify.com/api/auth/callback/discord` | Loggify の OAuth アプリ（Better Auth 標準） |
| エンドユーザーの認証 | `https://loggify.com/api/verify/{server_id}/callback` | 各サーバー運営者の OAuth アプリ |

### 5.3 Server Actions

更新系の操作はすべて Server Actions で実装し、`lib/actions/` に置く。FastAPI の更新系エンドポイントと 1 対 1 で対応させる（例: `updateServerSettings(serverId, input)` → `PATCH /v1/servers/{id}`）。組織・メンバー関連の Server Actions は Better Auth の `auth.api.*` を呼ぶ（例: `updateOrgName` → `auth.api.updateOrganization`）。

- すべて `createOrgAction`（05 §5.2）経由で実装し、`OrgContext` を経由しない組織データアクセスを作れないようにする
- 入力は zod で検証し、FastAPI / Better Auth のエラーをフォームに表示できる形で返す
- Passkey 登録・ログインは Better Auth のクライアント SDK（`authClient.passkey.*`）を Server Action からラップする
- 認証フローの `complete` も Server Action で行う

### 5.4 FastAPI クライアント（Next.js）

- `lib/api/client.ts`（`import "server-only"`）に集約する。JWT の発行（`auth.api.getToken`）・付与・エラーの変換を 1 か所で行う
- 型は FastAPI の OpenAPI から生成した `lib/api/schema.d.ts` を使う
