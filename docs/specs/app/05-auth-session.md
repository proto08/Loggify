# 05. 認証・セッション・認可

## 1. 前提: BFF 構成

```
Browser ──(Cookie)──▶ Next.js（loggify.com, BFF） ──(サービス認証 + 転送ヘッダー)──▶ FastAPI（内部のみ）
```

- ブラウザが通信するのは Next.js だけ。FastAPI はインターネットに公開しない（Container Apps の内部 ingress）
- Cookie はすべて Next.js（`loggify.com`）が発行・保持し、FastAPI には**ヘッダーで**渡す
- 認証の判定（state の照合、セッションの検証、WebAuthn の検証）は FastAPI が行う。Next.js は値を受け渡すだけで、秘密鍵を持たない
- ブラウザ → Next.js 間には CORS が不要（同一オリジン）

## 2. Next.js → FastAPI の呼び出し

### 2.1 サービス認証

FastAPI は、Next.js 以外からのリクエストを受け付けない。

| 層 | 対策 |
|---|---|
| ネットワーク | FastAPI は内部 ingress のみ（インフラ設計） |
| アプリ | すべてのリクエストに `Authorization: Bearer <サービストークン>` を必須とする（`/health` を除く） |

サービストークンの方式（D10）:

| 案 | 内容 | 評価 |
|---|---|---|
| A. Entra ID のクライアント資格情報（推奨） | Next.js が Managed Identity で backend アプリのトークンを取得し、FastAPI が発行者・audience・app role を検証 | シークレットの受け渡しが不要。`infra/entra.tf` に backend のアプリ登録がすでにある（ただし今の定義はユーザー委任スコープ `access_as_user` なので、app role の追加が必要） |
| B. 共有シークレット | Key Vault の値を両方に環境変数で渡し、定数時間で比較 | 実装が簡単。ローテーション時は 2 つの値を並行して受け付ける必要がある |

### 2.2 転送ヘッダー

| ヘッダー | 内容 | 使う API |
|---|---|---|
| `Authorization` | サービストークン | すべて |
| `X-Session-Token` | Cookie `__Host-lgf_session` の値 | ダッシュボード系 |
| `X-Verification-Token` | Cookie `__Host-lgf_vs` の値 | 認証フロー系 |
| `X-Client-IP` | エンドユーザーの IP（§2.3） | すべて |
| `X-Client-User-Agent` | ブラウザの User-Agent | すべて |
| `X-Request-Id` | Next.js で採番（ログの突き合わせ用） | すべて |

FastAPI がこれらのヘッダーを信用するのは、サービス認証を通ったリクエストに限る。

### 2.3 クライアント IP

- Next.js は ingress が付ける `X-Forwarded-For` からクライアント IP を取り出し、`X-Client-IP` として FastAPI に渡す
  - 取り出し方（右から何番目を使うか、Cloudflare の `CF-Connecting-IP` を優先するか）は前段の構成で決まるため、インフラ設計で確定する
  - ブラウザが送ってきた `X-Client-IP` は Next.js で必ず捨てる
- FastAPI 側では `X-Client-IP` 以外の IP 情報（接続元アドレス = Next.js）を使わない

### 2.4 呼び出し元の実装（Next.js）

| 用途 | Next.js の仕組み |
|---|---|
| 画面表示のためのデータ取得 | Server Components から `lib/api/`（サーバー専用のクライアント、`import "server-only"`）経由で FastAPI を呼ぶ |
| 更新系（フォーム送信など） | Server Actions。Next.js が Origin を検査するため、CSRF 対策になる |
| リダイレクトを伴うもの（OAuth の開始とコールバック、ログアウト） | Route Handlers（`app/api/**/route.ts`） |

FastAPI から 401 が返ったら、Next.js は Cookie を削除して `/login?next=...` へリダイレクトする。

## 3. システムユーザーの認証

### 3.1 方式

| 方式 | 位置づけ |
|---|---|
| Discord OAuth2（Loggify 自身の OAuth アプリ、scope は `identify`） | アカウント作成に必須。いつでもログインに使える |
| Passkey（WebAuthn） | ログイン後に追加で登録する。登録後は Passkey だけでログインできる |

- アカウントの復旧は Discord ログインで行う
- WebAuthn: `rp_id = loggify.com`、`origin = https://loggify.com`、`user_verification = preferred`、discoverable credential。FastAPI で `py_webauthn` を使って検証する

### 3.2 Discord ログイン

```
Browser  GET /api/auth/discord/login?next=/orgs/xxx                       （Next Route Handler）
Next     POST /v1/auth/discord/authorize { next }                          → FastAPI
FastAPI  state を生成し { authorize_url, state_cookie } を返す
         state_cookie = sign(state, next, 有効期限 5 分)
Next     Set-Cookie: __Host-lgf_oauth=state_cookie → 302 authorize_url
   ⋮ Discord で許可
Browser  GET /api/auth/discord/callback?code&state                        （Next Route Handler）
Next     POST /v1/auth/discord/callback { code, state, state_cookie }      → FastAPI
FastAPI  署名と state の一致を検証 → code を交換 → /users/@me
         → system_users を upsert → auth_sessions を作成
         → { session_token, expires_at, next } を返す
Next     Set-Cookie: __Host-lgf_session=session_token、__Host-lgf_oauth を削除 → 302 next
```

- `next` は `/` で始まり `//` で始まらない相対パスのみ許可する（オープンリダイレクト対策）。FastAPI で検証する
- Discord の redirect_uri は `https://loggify.com/api/auth/discord/callback`

### 3.3 Passkey

- ログイン: Server Action → `POST /v1/auth/passkey/login/begin` → `{ options, challenge_token }`。Next.js は `challenge_token` を Cookie `__Host-lgf_webauthn`（5 分）に保存し、`finish` のときに渡す。成功すると `session_token` が返る
- 登録: ログイン済みで、セッションの作成から 10 分以内であること（再ログインを求める）

## 4. セッション

BFF 構成ではブラウザが FastAPI を直接呼ばないため、JWT とリフレッシュトークンは使わない。**サーバー側で管理する不透明なセッショントークン**を 1 本だけ使う。

| 項目 | 仕様 |
|---|---|
| トークン | 32 バイトの乱数（base64url）。DB には SHA-256 のハッシュだけを保存 |
| Cookie | `__Host-lgf_session`（`HttpOnly; Secure; SameSite=Lax; Path=/`、Domain 指定なし） |
| 有効期限 | 最終利用から 7 日（スライディング）、作成から最大 30 日（絶対） |
| 延長 | FastAPI は `last_used_at` を更新し、残りが 3 日を切ったらレスポンスヘッダー `X-Session-Expires-At` で新しい期限を返す。Next.js は Cookie の `Max-Age` を更新する（トークン自体は変えない） |
| 失効 | ログアウト・全端末ログアウト・アカウント削除で `revoked_at` を設定。リクエストのたびに DB を確認するため、失効はすぐに効く |
| ロール | セッションには持たせない。リクエストのたびに `org_members` を参照する |

ログアウトは Route Handler `POST /api/auth/logout` → `POST /v1/auth/logout` → Cookie 削除 → `/` へリダイレクト。

### 4.1 Cookie 一覧

| Cookie | 用途 | 有効期限 |
|---|---|---|
| `__Host-lgf_session` | システムユーザーのセッション | 7 日（スライディング） |
| `__Host-lgf_oauth` | Discord ログインの state | 5 分 |
| `__Host-lgf_webauthn` | Passkey のチャレンジ | 5 分 |
| `__Host-lgf_vs` | エンドユーザーの認証セッション | 10 分 |

すべて `HttpOnly; Secure; SameSite=Lax; Path=/`。`__Host-` を付けて、サブドメインからの上書きを防ぐ。

## 5. 認可（RBAC）

### 5.1 権限マトリクス

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

- admin の招待は owner だけが発行できる（D9）
- owner の退会・アカウント削除は、移譲または組織削除が済むまで 409 にする。owner 不在の状態は作らない

### 5.2 実装（FastAPI）

FastAPI の依存性注入（`Depends`）で実装する。

| 依存関数 | 役割 |
|---|---|
| `require_service` | サービストークンの検証（ルーター全体に適用） |
| `current_user` | `X-Session-Token` を検証し、`SystemUser` とセッションを返す。失敗なら 401 |
| `org_role(min_role)` | パスの `org_id`、または `server_id` / `log_id` から引いた `org_id` について `org_members` を参照する。ロールが不足、または非所属なら **404** |
| `require_sysadmin` | `system_users.is_sysadmin` を DB で確認する |

- repository の関数は `org_id` を必須の引数にし、ID だけで取得する関数を作らない（IDOR 対策）
- Next.js 側でもロールに応じてボタンの表示を切り替えるが、判定の正本は FastAPI

## 6. ASN ルールの評価

### 6.1 優先順位（D4）

より具体的なスコープのルールが優先される。

```
1. サーバールールに一致 → その action（allow / block）
2. 組織ルールに一致     → その action
3. デフォルトリストに一致 → block
4. どれにも一致しない    → allow
```

- 組織でブロックした ASN を、サーバーで allow に上書きできる
- サーバーの `block_vpn = false` のときは評価しない（`layer = "disabled"`）
- 判定結果は `asn_decision = { action, layer: "server" | "org" | "default" | "none" | "disabled" }` としてログに残す

### 6.2 デフォルトリストの更新（D5）

組織・サーバーは常に最新のデフォルトリストを参照する（スナップショットは取らない）。更新時の通知は MVP では行わない。

## 7. エンドユーザーの認証フロー（詳細）

### 7.1 start

```
Browser  /v/[serverId] で「同意して続ける」
         → GET /api/verify/{server_id}/start?consent={version}             （Next Route Handler）
Next     POST /v1/verify/{server_id}/start { consent_version }              → FastAPI
FastAPI  1. servers.status = active でなければ { status: "unavailable" }
         2. consent_version が現在の値と違えば { status: "consent_outdated" }
         3. レート制限（IP）
         4. verification_sessions を作成（oauth_state を生成、有効期限 10 分）
         5. { authorize_url, verification_token, expires_at } を返す
Next     Set-Cookie: __Host-lgf_vs=verification_token → 302 authorize_url
         （unavailable → /result/{id}/unavailable、consent_outdated → /v/{id}）
```

authorize_url の中身: `https://discord.com/oauth2/authorize?client_id=…&redirect_uri=https://loggify.com/api/verify/{server_id}/callback&scope=identify[+email]&state=…&response_type=code&prompt=none`

### 7.2 callback

```
Browser  GET /api/verify/{server_id}/callback?code&state                   （Next Route Handler）
Next     POST /v1/verify/{server_id}/callback { code, state }
         + X-Verification-Token                                             → FastAPI
FastAPI  1. トークンからセッションを取得し、server_id と state を照合
         2. サーバーの Client ID / Secret で code を交換
         3. GET /users/@me → verification_sessions.discord_user に保存
         4. Discord のアクセストークン・リフレッシュトークンは破棄（DB にも通知にも出さない）
Next     成功 → 302 /verify/{server_id}、失敗 → 302 /result/{server_id}/error
```

### 7.3 complete

`/verify/[serverId]` のページは Server Component で `GET /v1/verify/{id}/session` を呼んで表示する。送信は Server Action で行う。

```
Server Action  POST /v1/verify/{server_id}/complete + X-Verification-Token   → FastAPI
FastAPI  1. セッションが有効・未完了・discord_user あり、でなければ "expired"
         2. レート制限（IP、server_id + discord_id） → "rate_limited"
         3. Turnstile を検証（remoteip = X-Client-IP） → 失敗なら "captcha"
         4. collect_gps = required かつ location = null → "declined"
         5. X-Client-IP → ipinfo（ASN・国・都市・ISP）。失敗したら ASN 不明として続ける
         6. ASN 評価 → block なら "vpn"
         7. GPS があれば逆ジオコーディング（失敗しても続ける）
         8. Bot で PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}
              失敗したら result = role_failed、servers.last_check_error に記録し、ユーザーには "error"
         9. verification_logs に INSERT
        10. 通知チャネルへ送信（同期・リトライなし・タイムアウト 3 秒）→ notify_status を更新
        11. verification_sessions.completed_at を設定
        12. { status } を返す
Next     __Host-lgf_vs を削除 → redirect("/result/{server_id}/{status}")
```

- 3〜8 の途中で終わった場合も 9〜11 は実行する（`captcha`・`vpn` などの失敗もログに残す）
- 1・2 で終わった場合はログに残さない
- 通知には要約とダッシュボードへのリンクのみを含め、IP・GPS・住所は含めない（D8）
