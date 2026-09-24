# 05. 認証・セッション・認可

## 1. システムユーザーの認証

### 1.1 方式

| 方式 | 位置づけ |
|---|---|
| Discord OAuth2（Loggify 自身の OAuth アプリ、scope は `identify`） | アカウント作成に必須。いつでもログインに使える |
| Passkey（WebAuthn） | ログイン後に追加で登録できる。登録後は Passkey だけでログインできる |

- アカウントの復旧は Discord ログインで行う（メールによる復旧は持たない）
- WebAuthn の設定: `RPID = loggify.com`、`RPOrigins = [https://loggify.com]`、`UserVerification = preferred`、discoverable credential（ユーザー名の入力なしでログイン）

### 1.2 Discord ログインの流れ

```
GET /v1/auth/discord/login?next=/orgs/xxx
  → state = 32 バイトの乱数、Cookie lgf_oauth（state と next を HMAC で署名したもの。5 分、Path=/v1/auth）
  → 302 Discord
GET /v1/auth/discord/callback?code&state
  → Cookie の state と照合 → code を交換 → /users/@me を取得
  → system_users を discord_id で upsert
  → auth_sessions を作成 → Cookie lgf_at / lgf_rt を発行
  → 302 https://loggify.com{next}（next は "/" で始まる相対パスのみ許可）
```

## 2. トークンとセッション

| 名前 | 中身 | 有効期限 | Cookie 属性 |
|---|---|---|---|
| `lgf_at` | アクセストークン（JWT, HS256） | 15 分 | `HttpOnly; Secure; SameSite=Lax; Domain=loggify.com; Path=/` |
| `lgf_rt` | リフレッシュトークン（32 バイトの乱数） | 30 日（絶対期限）、14 日使われなければ失効 | `HttpOnly; Secure; SameSite=Strict; Domain=api.loggify.com; Path=/v1/auth` |

- `lgf_at` を `Domain=loggify.com` にするのは、Next.js の Server Components で Cookie を読み、API に転送するため
- JWT のクレーム: `{ sub: system_user_id, sid: auth_session_id, iat, exp }`
  - 組織のロールは JWT に**入れない**（変更がすぐ反映されるよう、リクエストごとに DB の `org_members` を引く）
  - `is_sysadmin` も入れず、`/admin/*` では DB で確認する
- 署名鍵は環境変数 `JWT_SIGNING_KEYS`（ローテーション用に複数の鍵を持つ。`kid` ヘッダーで選ぶ）

### 2.1 リフレッシュ

```
POST /v1/auth/refresh（lgf_rt）
  → hash(rt) = refresh_token_hash のセッションを探す
       見つかった     → 新しい rt を発行し、previous_token_hash に旧値を移して更新 → 新しい at / rt を返す
       previous と一致 → 再利用（盗用の疑い）と判断してセッションを失効 → 401
       それ以外        → 401
```

- フロントは 401 `token_expired` を受け取ったら 1 回だけ refresh して再試行する。同時に複数のリクエストが refresh しないよう、フロント側で 1 本にまとめる
- ログアウトや全端末ログアウトは `auth_sessions.revoked_at` を設定する。アクセストークンは最大 15 分有効なまま残るため、`/me/sessions` の操作や権限変更などの重要な操作では、`sid` が失効していないか DB で確認する

### 2.2 CSRF 対策

- SameSite=Lax/Strict に加え、状態を変更するリクエストでは `Origin` ヘッダーが許可リストに含まれることを必須にする
- カスタムヘッダー `X-Loggify-Client: web` を必須にする。単純なフォーム送信では付けられないため、CORS のプリフライトが強制される

## 3. 認可（RBAC）

### 3.1 権限マトリクス

| 操作 | viewer | admin | owner | sysadmin |
|---|:-:|:-:|:-:|:-:|
| 組織・サーバー・設定の閲覧 | ✓ | ✓ | ✓ | ✓ |
| 認証ログの閲覧 | ✓ | ✓ | ✓ | ✓（監査ログに記録） |
| 組織名の変更 | | ✓ | ✓ | |
| サーバーの登録・設定変更・資格情報の更新・削除 | | ✓ | ✓ | |
| ASN ルールの編集（組織・サーバー） | | ✓ | ✓ | |
| 通知チャネルの編集 | | ✓ | ✓ | |
| 招待リンクの発行・取り消し | | ✓（viewer 招待のみ） | ✓ | |
| メンバーのロール変更 | | ✓（viewer ↔ admin。自分自身は不可） | ✓ | |
| メンバーの除外 | | ✓（viewer のみ） | ✓（owner 以外） | |
| 自分の脱退 | ✓ | ✓ | ✗（先に移譲が必要） | |
| 個人データ削除の実行 | | ✓ | ✓ | ✓ |
| 監査ログの閲覧 | | ✓ | ✓ | ✓ |
| オーナー移譲・組織削除 | | | ✓ | |
| デフォルト ASN の管理・サーバーの強制停止 | | | | ✓ |

- admin による招待は viewer ロールのみ、admin の招待は owner のみとし、admin が増えていく経路を owner に限定する
- owner の退会・アカウント削除は、移譲または組織削除が済むまで 409 にする。owner 不在の状態は作らない

### 3.2 実装

- `middleware.RequireLogin` — JWT を検証し、`ctx` に `system_user_id` と `sid` を設定する
- `middleware.RequireOrgRole(min)` — パスの `org_id`、または `server_id` / `log_id` から引いた `org_id` について `org_members` を参照し、ロールが不足または非所属なら **404**
- repository の関数は `orgID` を引数に取ることを必須にし、ID だけで取得する関数を作らない（IDOR 対策）

## 4. ASN ルールの評価

### 4.1 優先順位（D4）

より具体的なスコープのルールが優先される。

```
1. サーバールールに一致 → その action（allow / block）
2. 組織ルールに一致     → その action
3. デフォルトリストに一致 → block
4. どれにも一致しない    → allow
```

- 組織でブロックした ASN をサーバーで allow できる（組織ルールは「組織の既定値」という位置づけ）
- サーバーの `block_vpn = false` のときは評価せずに allow（`asn_decision.layer = "disabled"`）
- 判定結果は `asn_decision = { action, layer: "server" | "org" | "default" | "none" | "disabled" }` としてログに残す

### 4.2 デフォルトリストの更新（D5）

- 組織・サーバーは常に最新のデフォルトリストを参照する（スナップショットは取らない）
- 更新時の通知は MVP では行わない

## 5. エンドユーザーの認証フロー（詳細）

### 5.1 start

```
GET /v1/verify/{server_id}/start?consent={version}
  1. servers.status = active でなければ → 302 /result/{id}/unavailable
  2. consent がサーバーの現在の同意バージョンと一致しなければ → 302 /v/{id}（同意画面へ戻す）
  3. レート制限（IP）
  4. verification_sessions を作成（oauth_state を生成、有効期限 10 分）
  5. Cookie lgf_vs = sign(session_id)
       HttpOnly; Secure; SameSite=Lax; Domain=loggify.com; Path=/; Max-Age=600
  6. 302 https://discord.com/oauth2/authorize?client_id=…&redirect_uri=…&scope=identify[+email]&state=…&prompt=none
```

### 5.2 callback

```
GET /v1/verify/{server_id}/callback?code&state
  1. lgf_vs からセッションを取得し、server_id と state を照合（一致しなければ error）
  2. サーバーの Client ID / Secret で code を交換
  3. GET /users/@me で Discord ユーザーを取得し、verification_sessions.discord_user に保存
  4. Discord のアクセストークン・リフレッシュトークンは破棄する（DB にも通知にも出さない）
  5. 302 https://loggify.com/verify/{server_id}
```

### 5.3 complete

```
POST /v1/verify/{server_id}/complete
  1. lgf_vs を検証 → セッションが有効・未完了・discord_user あり、でなければ "expired"
  2. レート制限（IP、server_id + discord_id） → "rate_limited"
  3. Turnstile を検証（remoteip も渡す） → 失敗なら "captcha"
  4. collect_gps = required かつ location = null → "declined"
  5. クライアント IP → ipinfo（ASN・国・都市・ISP）。失敗したら ASN 不明として続ける
  6. ASN 評価 → block なら "vpn"
  7. GPS があれば逆ジオコーディング（失敗しても続ける）
  8. Bot で PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}
       失敗したら result = role_failed、servers.last_check_error に記録し、ユーザーには "error" を返す
  9. verification_logs に INSERT（1〜8 のどこで終わっても、2 以降の結果は必ず記録する）
 10. 通知チャネルへ送信（同期・リトライなし、タイムアウト 3 秒）→ notify_status を更新
 11. verification_sessions.completed_at を設定し、lgf_vs を削除
 12. 200 { status }
```

- 3〜8 の途中で終わった場合も、9〜11 は実行する（`captcha`・`vpn` などの失敗もログに残す）
- 1 と 2 で終わった場合（セッションなし・レート制限）はログに残さない（Discord ID が分からない、または大量の試行を記録しないため）
- 通知の本文には、ダッシュボードのログ詳細へのリンクと要約（Discord ユーザー・結果・国・ASN 判定）のみを含める。IP・GPS 座標・住所などの詳細個人データは通知に**含めない**（06 参照）
