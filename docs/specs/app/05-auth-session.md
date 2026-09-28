# 05. 認証・セッション・認可

## 1. 前提: BFF 構成 + Better Auth

```
Browser ──(Cookie)──▶ Next.js（loggify.com, BFF + Better Auth） ──(JWT)──▶ FastAPI（内部のみ）
                              │
                              ▼
                        Postgres: auth スキーマ
                        （user / session / account / organization / member / invitation / passkey）
```

- ブラウザが通信するのは Next.js だけ。FastAPI はインターネットに公開しない（Azure Container Apps、内部 ingress）
- **システムユーザーの認証・セッション・組織・メンバー・招待の基盤データは Better Auth（Next.js 側）が持つ**。物理的には Postgres の `auth` スキーマ
- **FastAPI は `auth` スキーマを直接読み書きしない**。Next.js が Better Auth の JWT プラグインで発行した短命 JWT を検証するだけ（§3）
- FastAPI 自身のデータ（サーバー・認証ログ・ASN ルール等）は `app` スキーマ。Alembic で管理する（04 参照）

## 2. なぜこの構成にしたか（経緯）

- 当初検討した「Better Auth を DB レスにする」「FastAPI が `auth` テーブルも直接読む」はどちらも Better Auth の設計思想と衝突するため採用しなかった。Better Auth は「ライブラリに認証データの制御を委ねる」前提で作られている
- NextAuth(Auth.js) も検討したが、別言語バックエンド向けの検証手段が公式に用意されておらず（セッション JWT は暗号化フォーマットで非公式なリバースエンジニアリングが必要）、Better Auth の JWT プラグイン（JWKS 検証、公式に外部サービス向けと明記）の方が今回の構成に適している
- `org_id` は組織ごとに動的に変わる（1 ユーザーが複数組織に所属しうる）ため、ログイン時に 1 回だけ発行する長命トークンには向かない。**JWT はリクエストごとに都度発行**することで解決する（§3）

## 3. Next.js → FastAPI の認証連携（JWT + JWKS）

### 3.1 全体の流れ

```
① システムユーザーが Next.js にログイン（Better Auth がセッションを作る。§4）

② system_user が /orgs/{org_id}/... にアクセス
   Next.js: requireOrgMember(orgId, minRole) を実行
          → Better Auth の DB（auth.member）を直接見て検証（§5.3）
          → 型は OrgContext（ブランド型。requireOrgMember 経由でしか作れない）

③ Next.js: auth.api.getToken({ payload: { sub, org_id, role } })
          → Better Auth が秘密鍵で署名した JWT を発行（有効期限 30 秒、都度発行でキャッシュしない）

④ Next.js → FastAPI: Authorization: Bearer <JWT> を付けて API を叩く

⑤ FastAPI: JWKS（/api/auth/jwks）で署名検証
          → 正しければペイロードの sub / org_id / role をそのまま信頼する（DB には問い合わせない）
          → その org_id を使って Postgres トランザクションに `SET LOCAL app.current_org_id` を実行（RLS、04 参照）
```

### 3.2 JWT の中身（definePayload）

| クレーム | 内容 |
|---|---|
| `sub` | `system_user_id`（Better Auth の `user.id`） |
| `org_id` | アクセス先の組織 ID（`requireOrgMember` が解決した値） |
| `role` | その組織でのロール（`requireOrgMember` が解決した値） |
| `exp` | 発行から 30 秒 |
| `iss` / `aud` | Better Auth の `BASE_URL` |

- 組織に紐づかない API（例: `GET /v1/me` 相当の情報、ログイン直後の組織一覧取得）は `org_id` / `role` を省いて発行する。FastAPI 側はこれらのクレームが無いエンドポイントでは要求しない
- キャッシュしない。`requireOrgMember` を呼ぶたびに新しく発行する（複数組織対応・即時失効のため）

### 3.3 FastAPI 側の検証

FastAPI の依存性注入（`Depends`）で実装する。DB には一切問い合わせない。

| 依存関数 | 役割 |
|---|---|
| `require_service` | `/health`・`/v1/public/*`・`/v1/verify/*` 以外の全エンドポイントに適用。JWKS で署名検証し、`exp`・`iss`・`aud` を確認。失敗なら 401 |
| `current_user` | JWT の `sub` クレームを検証し、`system_user_id` を返す。`org_id`/`role` を要求しない |
| `org_role(min_role)` | JWT の `org_id`・`role` クレームを検証し、`role` が `min_role` を満たさなければ **404**（IDOR 対策として、権限不足と非存在を区別しない） |
| `require_sysadmin` | JWT の `sub` が `app.sysadmins` テーブル（FastAPI 自身のテーブル、§7）に含まれるか確認 |

- `/v1/verify/*`（エンドユーザー向け）と `/v1/public/*` はこの JWT 検証を使わない。`X-Verification-Token`（FastAPI 自身が発行・管理する不透明トークン）か、無認証で内部ネットワークの隔離のみに依拠する（旧来設計のまま）
- FastAPI が JWT 検証に成功したことは「Next.js を経由した正当なリクエストである」ことの証明も兼ねる。そのため、これとは別の「サービス間 Bearer トークン」は不要（旧設計で検討していたものは廃止）

## 4. システムユーザーの認証（Better Auth）

### 4.1 方式

| 方式 | 位置づけ |
|---|---|
| Discord OAuth2（Loggify 自身の OAuth アプリ） | ログイン方法の 1 つ |
| Microsoft(Entra ID) OAuth2（Loggify 自身の OAuth アプリ） | ログイン方法の 1 つ |
| Passkey（WebAuthn、Better Auth の passkey プラグイン） | ログイン後の追加登録のみ。`registration.requireSession` は既定の `true` のまま（Passkey 単体での新規登録・ログインは不可） |

- Discord・Microsoft どちらも `email` スコープを要求する（Better Auth の `user` テーブルは `email` が必須・一意のため）
- コールバックパス（Better Auth の規約どおり）:
  - Discord: `https://loggify.com/api/auth/callback/discord`
  - Microsoft: `https://loggify.com/api/auth/callback/microsoft`
- `infra/entra.tf` の redirect_uri は現在 NextAuth の規約（`/api/auth/callback/azure-ad`）のままなので、上記に修正が必要（インフラ設計で対応）

### 4.2 Passkey の UX

`autocomplete="webauthn"` を使った conditional UI に対応させ、ログイン画面でメールアドレス入力なしに保存済み Passkey を候補表示できる（Discord/Microsoft ボタンと並べて配置）。

## 5. セッションと組織アクセスの防御（Better Auth 側）

### 5.1 セッション

Better Auth 標準のセッション管理をそのまま使う。

| 項目 | 内容 |
|---|---|
| Cookie | Better Auth が管理（`HttpOnly; Secure; SameSite=Lax`） |
| セッションテーブル | `auth.session`（`ipAddress` カラムに Better Auth の IP 検出機能で記録。§8 参照） |
| ログアウト・全端末ログアウト | Better Auth 標準 API |

### 5.2 `requireOrgMember`: 組織データへのアクセスを必ず通す関所

RLS を `auth` スキーマには適用しない（Better Auth 内部のクエリパターンと衝突するため。§6 の招待のような、組織が定まる前のクエリも存在する）。代わりに、**組織データへのアクセス経路をコードの構造で強制する**。

```typescript
declare const orgContextBrand: unique symbol; // このファイルの外に export しない

type OrgContext = {
  orgId: string;
  role: Role;
  systemUserId: string;
  readonly [orgContextBrand]: true;
};

async function requireOrgMember(orgId: string, minRole: Role): Promise<OrgContext> {
  const member = await auth.api.getMember({ organizationId: orgId }); // auth.member を確認
  if (!member || rank(member.role) < rank(minRole)) notFound(); // 404
  return { orgId, role: member.role, systemUserId: member.userId } as OrgContext;
}
```

- **読み取り系(ページ)**: `app/(dashboard)/orgs/[orgId]/layout.tsx` が `requireOrgMember` を実行し、結果を配下の全ページに渡す。Next.js のレイアウトは必ず経由されるため、個々のページで呼び忘れることが構造的にできない
- **書き込み系(Server Actions)**: `createOrgAction(handler)` というファクトリ関数を必ず経由させる。`OrgContext` 型は `requireOrgMember` の戻り値からしか作れない（ブランド型）ため、これを経由しない組織データアクセス関数は型エラーになる
- `OrgContext` は `unique symbol` を含むためシリアライズできない。Client Component の props やフォームの隠しフィールドには一切乗らない（サーバー側だけで完結する）
- これは RLS ほど強い保証（DB が物理的に守る）ではなく、**コードの規約による防御**である点に注意。`app`スキーマのRLS（04参照）とは防御の強さが異なる

### 5.3 FastAPI 呼び出しとの関係

`OrgContext`（`orgId`・`role`）は、そのまま §3.2 の JWT ペイロードの `org_id`・`role` になる。つまり Next.js 側の認可判定（Better Auth の DB を見て検証）が、そのまま FastAPI 側の認可（JWT クレームを信頼するだけ）に伝播する構造になっている。

## 6. 組織・メンバー・招待

### 6.1 組織・メンバー: Better Auth の organization プラグインをそのまま使う

- `auth.organization` / `auth.member` テーブル。標準ロールは `owner` / `admin` / `member`。**画面表示は`viewer`にする**が、DB 上・プラグイン上のロール名は`member`のまま扱う
- 標準では持っていない独自ルールは、プラグインの API を薄くラップする Next.js 側のコードで追加する:
  - 「1 組織に owner は 1 人」→ 組織作成・オーナー移譲の前段でチェック
  - 「作成できる組織は 1 人 1 つまで」→ 組織作成の前段でチェック
  - 「admin の招待は owner だけ」→ §6.2 の自前招待ロジック内でチェック
  - 「メンバーの除外は admin(viewerのみ) / owner(owner以外)」→ 除外 API 呼び出しの前段でチェック

### 6.2 権限マトリクス

| 操作 | viewer(`member`) | admin | owner | sysadmin |
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
- owner の退会・アカウント削除は、移譲または組織削除が済むまで拒否する。owner 不在の状態は作らない（Better Auth 標準にはない制約なので、削除処理の前段で Next.js 側がチェックする）

### 6.3 招待: Better Auth 標準は使わず自前実装（D12）

確認の結果、Better Auth 標準の `inviteMember` / `acceptInvitation` は「**受諾時にログイン中ユーザーのメールアドレスが招待作成時のメールアドレスと完全一致すること**」を必須とし、これを無効化する設定はない。うちの要件（Discord チャンネルに URL を貼って、誰でも踏める・1 回限り）と根本的に合わないため、招待だけ自前実装する。

- テーブルは Better Auth の `auth.invitation` をそのまま使うが、**`inviteMember`/`acceptInvitation` API は呼ばず**、Next.js のサーバー側コードから直接 `auth.invitation` / `auth.member` に読み書きする
- トークンは 32 バイトの乱数。`invitation` レコードには `email` を使わず、招待用のトークンハッシュを別カラム（Better Auth のスキーマ拡張機能で追加）に持たせる
- 受諾フロー: `GET /invite/[token]` → ログイン確認 → 未使用・期限内であることを確認 → `UPDATE ... SET status = 'accepted' WHERE id = ? AND status = 'pending' AND expires_at > now()` の更新件数で 1 回限りを保証 → `auth.member` に直接 INSERT
- 有効期限の選択肢: 1h / 24h / 7d。同時発行数の上限なし
- 影響範囲は招待機能のみ（Better Auth の他の機能・プラグイン挙動には影響しない）。将来 Better Auth のスキーマが変わった場合、影響を受けるのはこの部分だけ

## 7. システム管理者(sysadmin)

- `is_sysadmin` は Better Auth の `user` テーブルには持たせない（FastAPI 自身の関心事のため）
- FastAPI 側 `app` スキーマに `sysadmins(system_user_id uuid PRIMARY KEY)` という許可リストテーブルを持つ
- `require_sysadmin` 依存性は、JWT の `sub` クレームがこのテーブルに載っているかを確認する（`app` スキーマ内で完結するので `auth` スキーマへの問い合わせは発生しない）
- sysadmin 向けエンドポイントは、通常の RLS 適用ロールとは別の `BYPASSRLS` 権限を持つ Postgres ロールで接続し直す。アクセスは必ず `audit_logs` に記録する（D7）

## 8. クライアント IP

Cloudflare（プロキシ有効・Under Attack Mode 常時 ON）を Azure Container Apps の前段に置く構成で確定。

```
Browser → Cloudflare（WAF / Under Attack Mode） → Azure Container Apps ingress → Next.js
```

- Cloudflare は `CF-Connecting-IP` ヘッダーに、Cloudflare 自身が観測した接続元 IP を設定する。これが最も信頼できる値
- Better Auth の IP 検出機能（`advanced.ipAddress`）を使う:
  ```typescript
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    }
  }
  ```
- エンドユーザーの認証フロー向け `X-Client-IP`（FastAPI に渡す値）も `CF-Connecting-IP` から抽出する共通関数を 1 つ作り、両方で使い回す。hCaptcha の `remoteip`（§10.3）もこの値を使う
- ブラウザが送ってきた `X-Client-IP` / `CF-Connecting-IP` は Next.js で必ず上書き・破棄する
- Azure 側は Cloudflare の IP レンジ以外からのアクセスを拒否するのが望ましい（インフラ設計側で対応。NSG / Container Apps の IP 制限）
- Cloudflare 自体の設定（DNS・TLS モード・WAF ルール）はインフラ設計（`docs/specs/infra/`）で扱う。Under Attack Mode は常時 ON（ダッシュボード・エンドユーザーの認証フロー双方でページ読み込み時に Cloudflare のチャレンジが挟まる。UX コストは許容する前提）

## 9. ASN ルールの評価

### 9.1 優先順位（D4）

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

### 9.2 デフォルトリストの更新（D5）

組織・サーバーは常に最新のデフォルトリストを参照する（スナップショットは取らない）。更新時の通知は MVP では行わない。

## 10. エンドユーザーの認証フロー（詳細）

この節は Better Auth と無関係（エンドユーザーは Loggify のアカウントを持たない）。FastAPI 自身が管理する `verification_sessions`（`app` スキーマ）と `X-Verification-Token` で完結する。

### 10.1 start

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

### 10.2 callback

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

### 10.3 complete

```
Server Action  POST /v1/verify/{server_id}/complete + X-Verification-Token   → FastAPI
FastAPI  1. セッションが有効・未完了・discord_user あり、でなければ "expired"
         2. レート制限（IP、server_id + discord_id） → "rate_limited"
         3. hCaptcha を検証（remoteip = X-Client-IP） → 失敗なら "captcha"
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
- 通知には認証結果・国・VPN 判定・Discord ユーザー情報・メールアドレス（収集時）・ダッシュボードへのリンクのみを含める。IP・GPS・住所・UA・フィンガープリントは含めない（D8、詳細は 06 §4）
