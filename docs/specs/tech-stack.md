# Loggify — 技術選定

## アーキテクチャ概要

```
[Browser] → [Next.js (BFF, 公開)] → [FastAPI (内部のみ)] → [PostgreSQL]
```

フロントエンドと API は分離した独立サービス。ブラウザは Next.js とだけ通信し、FastAPI は Next.js のサーバー側から呼ぶ（BFF 構成）。Docker Compose で自宅サーバーにホスト。

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
| 言語 | Python |
| フレームワーク | FastAPI + Pydantic v2 |
| ORM / DB ドライバ | SQLAlchemy 2.x（async）+ asyncpg |
| マイグレーション | Alembic |
| HTTP クライアント | httpx |
| パッケージ管理 | uv |

---

## 認証（システムユーザー）

| 項目 | 選定 |
|---|---|
| Discord OAuth2 | httpx で直接実装（トークン交換と `/users/@me` のみ） |
| Passkey (WebAuthn) | `py_webauthn`（ブラウザ側は `@simplewebauthn/browser`） |
| セッション | サーバー側で管理する不透明トークン（DB）。Cookie は Next.js が保持 |

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
