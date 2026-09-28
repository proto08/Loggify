# 04. データモデル

## 1. 方針

| 項目 | 方針 |
|---|---|
| スキーマ分離 | Postgres 1 インスタンスを **`auth`**（Better Auth 所有）と **`app`**（FastAPI 所有）の 2 スキーマに分ける。本章は主に `app` スキーマを定義する。`auth` スキーマは Better Auth 自身のツールが生成・管理するため、参考として §2 に概要のみ記す |
| 主キー | UUID v7（時系列でソートできる）。アプリ側で生成する |
| ORM | SQLAlchemy 2.x（async）+ asyncpg（`app` スキーマのみ） |
| Discord ID | `bigint`（snowflake）。API では文字列で返す |
| 削除 | サーバーは論理削除（`deleted_at`）。ASN ルール・通知チャネルは物理削除。認証ログは物理削除（個人データの削除要求・保存期間の満了時） |
| マルチテナント分離 | `org_id` を持つテーブルには repository 層で `WHERE org_id = :org_id` を必ず付ける（IDOR 対策）。**加えて Postgres の RLS を有効化する**（D11、§5） |
| スキーマ間の参照 | `org_id`・`actor_id` など `auth` スキーマの ID を指す値は、**物理外部キーを張らない**（マイグレーションツールが別々のため）。整合性は JWT クレーム経由のアプリ層検証に任せる |
| 秘密値 | `*_enc`（`bytea`）に AES-256-GCM で暗号化して保存する（§6） |
| マイグレーション | Alembic（`backend/migrations/`）。`app` スキーマのみ対象。autogenerate の結果は必ず目で確認してからコミットする |
| タイムスタンプ | `timestamptz`、UTC |

## 2. `auth` スキーマ（Better Auth 所有、参考）

Better Auth の organization / passkey プラグインが生成する。マイグレーションは Better Auth 側のツールで行うため、ここでは概要のみ記す（正確な定義は実装時に Better Auth のスキーマ生成コマンドの出力を見る）。

| テーブル | 概要 |
|---|---|
| `user` | システムユーザー本体。`id`, `name`, `email`(必須・一意), `emailVerified`, `image`, `createdAt`, `updatedAt` |
| `session` | ログインセッション。`ipAddress` を含む（05 §8） |
| `account` | Discord / Microsoft の外部アカウント連携 |
| `passkey` | WebAuthn の資格情報 |
| `organization` | 組織。`id`, `name`, `slug` 等 |
| `member` | 組織メンバー。`organizationId`, `userId`, `role`（`owner`/`admin`/`member`） |
| `invitation` | 招待。05 §6.3 のとおり、標準 API は使わず直接読み書きする |

`app.sysadmins` テーブル（§4）を除き、システムユーザーの識別情報はすべてこちら側にある。

## 3. `app` スキーマ ER 図

```
app.sysadmins（system_user_id を列挙するだけ。auth.user への物理FKなし）

app.servers
  │ 1:N ─ app.asn_rules (scope = server)
  │ 1:N ─ app.notification_channels
  │ 1:N ─ app.verification_sessions
  └─1:N─ app.verification_logs

app.asn_rules (scope = org) ── org_id は auth.organization.id を指すが物理FKなし
app.audit_logs               ── org_id, actor_id も同様
app.asn_default （システム共通）
```

## 4. テーブル定義

### app.sysadmins

システム管理者の許可リスト。`require_sysadmin` 依存性（05 §7）が参照する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| system_user_id | uuid | PK | `auth.user.id` の値（物理FKなし） |
| created_at | timestamptz | NOT NULL | |
| note | text | | 誰が・なぜ付与したか（手動運用） |

DB を直接更新して付与する（API からは変更不可）。

### app.servers

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | 開始 URL・redirect_uri に使う |
| org_id | uuid | NOT NULL | `auth.organization.id` の値（物理FKなし） |
| guild_id | bigint | NOT NULL | |
| name | text | NOT NULL | |
| icon_url | text | | check 時に Discord から取得 |
| status | text | CHECK IN ('draft','active','disabled','suspended') | `suspended` は sysadmin のみ設定可能 |
| discord_client_id | bigint | | |
| discord_client_secret_enc | bytea | | |
| bot_token_enc | bytea | | |
| role_id | bigint | | |
| block_vpn | boolean | NOT NULL DEFAULT true | |
| collect_gps | text | CHECK IN ('off','optional','required') DEFAULT 'optional' | D2 |
| collect_email | boolean | NOT NULL DEFAULT false | true のとき scope に `email` を追加 |
| retention_days | int | NOT NULL DEFAULT 90, CHECK 7〜365 | |
| last_checked_at | timestamptz | | |
| last_check_error | text | | 認証時のロール付与失敗もここに記録 |
| created_at / updated_at / deleted_at | timestamptz | | |

- 部分ユニークインデックス: `UNIQUE (guild_id) WHERE deleted_at IS NULL`（D6）

### app.notification_channels

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| server_id | uuid | FK → app.servers, NOT NULL | |
| type | text | CHECK IN ('discord_webhook','telegram') | |
| config_enc | bytea | NOT NULL | JSON を暗号化したもの（Webhook URL、Telegram の bot token と chat_id） |
| enabled | boolean | NOT NULL DEFAULT true | |
| last_error | text | | |
| last_error_at | timestamptz | | |
| created_at / updated_at | timestamptz | | |

### app.asn_default

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| asn | bigint | PK | |
| name | text | | |
| updated_at | timestamptz | | |

初期データは `frontend/lib/asn.json` から投入する。

### app.asn_rules

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| org_id | uuid | NOT NULL | テナント分離・RLS のため、サーバースコープのルールにも持たせる |
| server_id | uuid | FK → app.servers, NULL 可 | NULL なら組織スコープ |
| asn | bigint | NOT NULL | |
| action | text | CHECK IN ('allow','block') | |
| note | text | | |
| created_by | uuid | | `auth.user.id` の値（物理FKなし） |
| created_at | timestamptz | | |

- 一意制約: `UNIQUE (org_id, COALESCE(server_id, '00000000-0000-0000-0000-000000000000'), asn)`

### app.verification_sessions

Discord コールバックから認証完了までの一時的な状態。Next.js が Cookie `__Host-lgf_vs` に保存する `verification_token`（32 バイトの乱数）のハッシュで引く。エンドユーザーは `auth` スキーマと無関係（Loggify のアカウントを持たない）。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| token_hash | bytea | NOT NULL, UNIQUE | `verification_token` の SHA-256 |
| server_id | uuid | FK → app.servers, NOT NULL | |
| oauth_state | bytea | NOT NULL | start 時に生成 |
| consent_version | text | NOT NULL | 同意した文面のバージョン |
| discord_user | jsonb | | callback 後に設定: `{ id, username, global_name, avatar, email? }` |
| expires_at | timestamptz | NOT NULL | 作成から 10 分 |
| completed_at | timestamptz | | complete 時に設定（2 回目以降は `expired`） |
| created_at | timestamptz | | |

1 日 1 回、期限切れから 1 日以上経ったレコードをバッチで削除する。

### app.verification_logs

| カラム | 型 | 詳細個人データ | 説明 |
|---|---|---|---|
| id | uuid PK | | |
| org_id | uuid NOT NULL | | RLS の判定に使う（`auth.organization.id`、物理FKなし） |
| server_id | uuid NOT NULL | | FK → app.servers |
| discord_id | bigint NOT NULL | | |
| discord_username | text | | |
| discord_global_name | text | | |
| discord_avatar | text | | |
| email | text | ✓ | `collect_email` のときのみ |
| result | text NOT NULL | | `success` / `vpn` / `captcha` / `declined` / `role_failed` / `error` |
| asn | bigint | | |
| asn_decision | jsonb | | `{ action, layer }` |
| country | char(2) | | 集計用に残す |
| ip | inet | ✓ | |
| isp | text | ✓ | |
| region / city | text | ✓ | |
| latitude / longitude | double precision | ✓ | |
| location_accuracy | real | ✓ | |
| geo_address | text | ✓ | |
| screen_width / screen_height | int | ✓ | |
| user_agent | text | ✓ | |
| fingerprint_hash | text | ✓ | `visitor_id`・`canvas_hash`・audio・fonts・hardwareConcurrency 等を合成して SHA-256 したもの（D3） |
| fingerprint_webgl_renderer | text | ✓ | 生の値（D3、複数アカウント検知の精度のため保存） |
| fingerprint_webgl_vendor | text | ✓ | 生の値（D3） |
| fingerprint_canvas_hash | text | ✓ | 生の値（FingerprintJS の canvas コンポーネントのハッシュそのもの。D3） |
| consent_version | text NOT NULL | | |
| notify_status | text | | `sent` / `failed` / `none` |
| pii_purged_at | timestamptz | | 詳細個人データを消去した日時 |
| created_at | timestamptz NOT NULL | | |

インデックス:

- `(org_id, created_at DESC, id DESC)` — 組織横断の一覧（cursor 方式）
- `(server_id, created_at DESC, id DESC)` — サーバー別の一覧
- `(org_id, discord_id)` — Discord ID 検索・削除要求
- `(org_id, ip)` — IP 検索（消去後は NULL）
- `(created_at) WHERE pii_purged_at IS NULL` — 消去バッチ用

パーティショニングは MVP では行わない。詳細個人データを保存期間後に消去するため、行数は増えても 1 行あたりのサイズは小さくなる。1,000 万行を超えた時点で月単位のパーティションを検討する。

### app.audit_logs

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| org_id | uuid | 組織に属さない操作（sysadmin の操作など）は NULL。`auth.organization.id`、物理FKなし |
| actor_id | uuid | 操作した system_user。`auth.user.id`、物理FKなし |
| actor_username | text | **書き込み時の表示名を非正規化して保存**。後から本人が改名しても、操作当時の名前が残る（監査ログの性質上、そちらが正しい）。Next.js から渡される JWT の `sub` に対応する表示名は、`requireOrgMember` 実行時に Better Auth から取得して渡す |
| action | text | 例: `server.create`, `server.credentials.update`, `member.role.update`, `invite.create`, `asn_rules.replace`, `data_erasure.create`, `sysadmin.logs.read` |
| target_type / target_id | text / uuid | |
| metadata | jsonb | 変更前と変更後の値（**秘密値は含めない**） |
| ip | inet | 操作者の IP |
| created_at | timestamptz | |

監査ログは 2 年保存し、アプリからは削除できないようにする。

`org.*` 系（組織作成・メンバー変更・招待）の操作は `auth` スキーマ側で完結するため、この監査ログには**サーバー・ASN ルール・データ削除など `app` スキーマに対する操作のみ**が記録される。組織・メンバー系の監査ログが必要な場合は Better Auth 側に別途持たせるか、Next.js から `app.audit_logs` に書き込む（要検討）。

## 5. Row Level Security（`app` スキーマ、D11）

`app` スキーマの `org_id` を持つテーブル（`servers`, `asn_rules`, `verification_logs`, `audit_logs`）に RLS を有効化する。`auth` スキーマには適用しない（05 §5.2 の理由により、コード規約側で防御する）。

```sql
ALTER TABLE app.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.verification_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON app.verification_logs
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

- FastAPI の DB セッション依存性が、トランザクション開始直後に `SET LOCAL app.current_org_id = '<JWTのorg_idクレーム>'` を実行する（05 §3.1 ⑤）
- `SET LOCAL` はトランザクション内でのみ有効なため、リクエストごとに必ず新しいトランザクションを張る
- sysadmin 向けエンドポイントは `BYPASSRLS` 権限を持つ別ロールで接続し直す。必ず `app.audit_logs` に記録する

## 6. 秘密値の暗号化

- アルゴリズム: AES-256-GCM。保存形式は `key_version(1B) || nonce(12B) || ciphertext`
- 鍵: 環境変数 `ENCRYPTION_KEYS`（`v1:base64,v2:base64` の形式）。値の供給元は Key Vault（インフラ設計）
- 追加認証データ（AAD）に `table:column:row_id` を渡し、暗号文を別の行にコピーしても復号できないようにする
- 鍵のローテーション: 新しい鍵を追加して新規の書き込みを新しい鍵で行い、バッチで再暗号化したあと古い鍵を外す

## 7. 定期バッチ

FastAPI プロセスとは別に `python -m app.jobs <job名>` として起動する（実行基盤はインフラ設計。Container Apps Jobs を想定）。念のため `pg_try_advisory_lock` で重複実行を防ぐ。`auth` スキーマの期限切れセッション等は Better Auth 側の仕組みに任せる。

| ジョブ | 頻度 | 内容 |
|---|---|---|
| 詳細個人データの消去 | 1 時間ごと | `created_at < now() - servers.retention_days` のログの詳細個人データを NULL にし、`pii_purged_at` を設定する |
| 削除済みサーバーのログ消去 | 1 日ごと | 論理削除から 30 日経ったサーバーのログを物理削除する |
| 期限切れセッションの削除 | 1 日ごと | `app.verification_sessions` |
