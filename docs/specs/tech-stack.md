# Loggify — 技術選定

## アーキテクチャ概要

```
[Next.js (frontend)]  →  [Go (API)]  →  [PostgreSQL]
```

フロントエンドと API は分離した独立サービス。Docker Compose で自宅サーバーにホスト。

---

## フロントエンド

| 項目 | 選定 |
|---|---|
| フレームワーク | Next.js (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 + shadcn/ui |

---

## バックエンド

| 項目 | 選定 |
|---|---|
| 言語 | Go |
| ORM | GORM |

---

## 認証（システムユーザー）

| 項目 | 選定 |
|---|---|
| Discord OAuth2 | `golang.org/x/oauth2` |
| Passkey (WebAuthn) | `go-webauthn/webauthn` |
| セッション | JWT（`golang-jwt/jwt`） |

---

## データベース

| 項目 | 選定 |
|---|---|
| DB | PostgreSQL |
| ホスト | Docker コンテナ（自己ホスト） |

---

## インフラ

| 項目 | 選定 |
|---|---|
| ホスティング | 自宅サーバー |
| コンテナ | Docker Compose |
| サービス構成 | `web` / `api` / `db` |

---

## 外部サービス

| サービス | 用途 |
|---|---|
| Discord API | OAuth2 + Bot API（ロール付与） |
| Cloudflare Turnstile | CAPTCHA |
| ipinfo.io | IP ジオロケーション・ASN 取得 |
| gps-coordinates.net | GPS 逆ジオコーディング |
| Telegram Bot API | 通知（Post-MVP） |
