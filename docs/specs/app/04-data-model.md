# 04. データモデル

## 1. 方針

| 項目 | 方針 |
|---|---|
| 主キー | UUID v7（時系列でソートできる）。アプリ側で生成する |
| Discord ID | `bigint`（snowflake）。API では文字列で返す |
| 削除 | 組織・サーバー・システムユーザーは論理削除（`deleted_at`）。招待・セッション・Passkey・ASN ルールは物理削除。認証ログは物理削除（個人データの削除要求・保存期間の満了時） |
| マルチテナント分離 | テナントに属するテーブルには `org_id` を持たせ、repository 層で必ず `WHERE org_id = ?` を付ける（GORM Scope `ScopeOrg(orgID)`）。RLS は採用しない |
| 秘密値 | `*_enc`（`bytea`）に AES-256-GCM で暗号化して保存する（§4） |
| マイグレーション | golang-migrate（`backend/migrations/*.up.sql` / `*.down.sql`）。GORM の AutoMigrate は使わない |
| タイムスタンプ | `timestamptz`、UTC |

## 2. ER 図

```
system_users ─1:N─ auth_sessions
     │ 1:N ─ passkeys
     │
     └─N:M─ organizations  （中間テーブル: org_members。role = owner|admin|viewer）
                 │ 1:N ─ org_invites
                 │ 1:N ─ audit_logs
                 │ 1:N ─ asn_rules (scope = org)
                 │
                 └─1:N─ servers
                          │ 1:N ─ asn_rules (scope = server)
                          │ 1:N ─ notification_channels
                          │ 1:N ─ verification_sessions
                          └─1:N─ verification_logs  （org_id も非正規化して保持）

asn_default （システム共通）
```

「作成できる組織は 1 つまで」は `org_members.role = 'owner'` の件数でアプリ側がチェックする（ER 上の関係は「所属」の N:M）。

## 3. テーブル定義

### system_users

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| discord_id | bigint | NOT NULL, UNIQUE | |
| username | text | NOT NULL | ログインのたびに更新 |
| global_name | text | | |
| avatar | text | | Discord の avatar hash |
| is_sysadmin | boolean | NOT NULL DEFAULT false | DB を直接更新して付与する（API からは変更不可） |
| created_at / updated_at | timestamptz | NOT NULL | |
| deleted_at | timestamptz | | 削除時は username などを匿名化する |

### passkeys

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| system_user_id | uuid | FK → system_users, NOT NULL | |
| credential_id | bytea | NOT NULL, UNIQUE | |
| public_key | bytea | NOT NULL | |
| sign_count | bigint | NOT NULL | |
| aaguid | uuid | | |
| transports | text[] | | |
| name | text | NOT NULL | ユーザーが付ける名前 |
| created_at / last_used_at | timestamptz | | |

### auth_sessions

refresh トークンの管理用。1 レコード = 1 ログインセッション（端末）。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | JWT の `sid` |
| system_user_id | uuid | FK, NOT NULL | |
| refresh_token_hash | bytea | NOT NULL, UNIQUE | SHA-256。ローテーションのたびに更新 |
| previous_token_hash | bytea | | 直前のトークン。再利用の検知に使う |
| expires_at | timestamptz | NOT NULL | 絶対的な有効期限（30 日） |
| revoked_at | timestamptz | | |
| user_agent | text | | セッション一覧の表示用 |
| created_at / last_used_at | timestamptz | | |

### organizations

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| name | text | NOT NULL, 1〜64 文字 | 一意制約なし |
| created_at / updated_at / deleted_at | timestamptz | | |

### org_members

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| org_id | uuid | PK, FK | |
| system_user_id | uuid | PK, FK | |
| role | text | NOT NULL, CHECK IN ('owner','admin','viewer') | |
| created_at | timestamptz | | |

- 部分ユニークインデックス: `UNIQUE (org_id) WHERE role = 'owner'`（1 組織に owner は 1 人）

### org_invites

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| org_id | uuid | FK, NOT NULL | |
| token_hash | bytea | NOT NULL, UNIQUE | トークン本体（32 バイトの乱数）は保存しない |
| role | text | CHECK IN ('admin','viewer') | |
| expires_at | timestamptz | NOT NULL | |
| used_at | timestamptz | | |
| used_by | uuid | FK → system_users | |
| created_by | uuid | FK → system_users | |
| created_at | timestamptz | | |

受諾時は `UPDATE ... SET used_at = now() WHERE id = ? AND used_at IS NULL AND expires_at > now()` の更新件数で、1 回限りの使用を保証する。

### servers

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | 開始 URL・redirect_uri に使う |
| org_id | uuid | FK, NOT NULL | |
| guild_id | bigint | NOT NULL | |
| name | text | NOT NULL | |
| icon_url | text | | check 時に Discord から取得 |
| status | text | CHECK IN ('draft','active','disabled','suspended') | `suspended` は sysadmin のみ設定可能 |
| discord_client_id | bigint | | |
| discord_client_secret_enc | bytea | | |
| bot_token_enc | bytea | | |
| role_id | bigint | | |
| block_vpn | boolean | NOT NULL DEFAULT true | |
| collect_gps | text | CHECK IN ('off','optional','required') DEFAULT 'off' | |
| collect_email | boolean | NOT NULL DEFAULT false | true のとき scope に `email` を追加 |
| retention_days | int | NOT NULL DEFAULT 90, CHECK 7〜365 | |
| last_checked_at | timestamptz | | |
| last_check_error | text | | 認証時のロール付与失敗もここに記録 |
| created_at / updated_at / deleted_at | timestamptz | | |

- 部分ユニークインデックス: `UNIQUE (guild_id) WHERE deleted_at IS NULL`（D6）

### notification_channels

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| server_id | uuid | FK, NOT NULL | |
| type | text | CHECK IN ('discord_webhook','telegram') | |
| config_enc | bytea | NOT NULL | JSON を暗号化したもの（Webhook URL、Telegram の bot token と chat_id） |
| enabled | boolean | NOT NULL DEFAULT true | |
| last_error | text | | |
| last_error_at | timestamptz | | |
| created_at / updated_at | timestamptz | | |

### asn_default

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| asn | bigint | PK | |
| name | text | | |
| updated_at | timestamptz | | |

初期データは `frontend/lib/asn.json` から投入する。

### asn_rules

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| org_id | uuid | FK, NOT NULL | テナント分離のため、サーバースコープのルールにも持たせる |
| server_id | uuid | FK, NULL 可 | NULL なら組織スコープ |
| asn | bigint | NOT NULL | |
| action | text | CHECK IN ('allow','block') | |
| note | text | | |
| created_by | uuid | FK | |
| created_at | timestamptz | | |

- 一意制約: `UNIQUE (org_id, COALESCE(server_id, '00000000-0000-0000-0000-000000000000'), asn)`

### verification_sessions

Discord コールバックから認証完了までの一時的な状態。Cookie `lgf_vs` にはこの `id` を HMAC で署名した値を入れる。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK | |
| server_id | uuid | FK, NOT NULL | |
| oauth_state | bytea | NOT NULL | start 時に生成 |
| consent_version | text | NOT NULL | 同意した文面のバージョン |
| discord_user | jsonb | | callback 後に設定: `{ id, username, global_name, avatar, email? }` |
| expires_at | timestamptz | NOT NULL | 作成から 10 分 |
| completed_at | timestamptz | | complete 時に設定（2 回目以降は `expired`） |
| created_at | timestamptz | | |

1 日 1 回、期限切れから 1 日以上経ったレコードをバッチで削除する。

### verification_logs

| カラム | 型 | 詳細個人データ | 説明 |
|---|---|---|---|
| id | uuid PK | | |
| org_id | uuid NOT NULL | | |
| server_id | uuid NOT NULL | | |
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
| fingerprint_hash | text | ✓ | `visitor_id` と `canvas_hash` を連結して SHA-256 したもの（D3） |
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

### audit_logs

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| org_id | uuid | 組織に属さない操作（sysadmin の操作など）は NULL |
| actor_id | uuid | 操作した system_user |
| action | text | 例: `server.create`, `server.credentials.update`, `member.role.update`, `invite.create`, `asn_rules.replace`, `data_erasure.create`, `sysadmin.logs.read` |
| target_type / target_id | text / uuid | |
| metadata | jsonb | 変更前と変更後の値（**秘密値は含めない**） |
| ip | inet | 操作者の IP |
| created_at | timestamptz | |

監査ログは 2 年保存し、アプリからは削除できないようにする。

## 4. 秘密値の暗号化

- アルゴリズム: AES-256-GCM。保存形式は `key_version(1B) || nonce(12B) || ciphertext`
- 鍵: 環境変数 `ENCRYPTION_KEYS`（`v1:base64,v2:base64` の形式）。値の供給元は Key Vault（インフラ設計）
- 追加認証データ（AAD）に `table:column:row_id` を渡し、暗号文を別の行にコピーしても復号できないようにする
- 鍵のローテーション: 新しい鍵を追加して新規の書き込みを新しい鍵で行い、バッチで再暗号化したあと古い鍵を外す

## 5. 定期バッチ

Go API プロセス内のスケジューラで実行する。複数レプリカで重複実行しないよう、`pg_try_advisory_lock` で排他する。

| ジョブ | 頻度 | 内容 |
|---|---|---|
| 詳細個人データの消去 | 1 時間ごと | `created_at < now() - servers.retention_days` のログの詳細個人データを NULL にし、`pii_purged_at` を設定する |
| 削除済みサーバーのログ消去 | 1 日ごと | 論理削除から 30 日経ったサーバーのログを物理削除する |
| 期限切れセッションの削除 | 1 日ごと | verification_sessions / auth_sessions / org_invites |
