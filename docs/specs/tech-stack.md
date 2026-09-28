# Loggify — 技術選定

## アーキテクチャ概要

```
[Browser] → [Next.js (BFF, 公開)] → [FastAPI (内部のみ)] → [PostgreSQL]
```

フロントエンドと API は分離した独立サービス。ブラウザは Next.js とだけ通信し、FastAPI は Next.js のサーバー側から呼ぶ（BFF 構成）。デプロイ先は Azure Container Apps（`infra/` 参照。自宅サーバー / Docker Compose 案は不採用）。

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
| 認証基盤 | **Better Auth**（Next.js 側、TypeScript）。`organization` / `passkey` / `jwt` プラグインを使用 |
| OAuth プロバイダ | Discord・Microsoft(Entra ID)。Better Auth の組み込みソーシャルプロバイダー |
| Passkey (WebAuthn) | Better Auth の passkey プラグイン（追加登録のみ） |
| セッション | Better Auth 標準（DB セッション、Cookie は Next.js が保持） |
| Next.js → FastAPI 連携 | Better Auth の JWT プラグイン + JWKS（非対称鍵、都度短命発行）。詳細は `app/05-auth-session.md` |

DB アクセスの都合上、FastAPI 側は `py_webauthn` や自前の OAuth 実装を持たない（Better Auth に委ねる）。FastAPI が直接実装する認証は、エンドユーザー向けの Discord OAuth2（サーバーごとに異なる Client ID/Secret、`httpx` で直接実装）のみ。

---

## データベース

| 項目 | 選定 |
|---|---|
| DB | PostgreSQL（Azure Database for PostgreSQL Flexible Server） |
| スキーマ分離 | `auth`（Better Auth 所有）/ `app`（FastAPI 所有）。物理外部キーでは繋がない |
| マルチテナント分離 | アプリ層フィルタ + `app` スキーマへの Row Level Security |

---

## インフラ

| 項目 | 選定 |
|---|---|
| ホスティング | Azure Container Apps |
| サービス構成 | `frontend`(外部公開) / `backend`(内部 ingress のみ) / PostgreSQL Flexible Server |

詳細はインフラ設計（`docs/specs/infra/`、未作成）で扱う。

---

## 外部サービス

| サービス | 用途 |
|---|---|
| Discord API | OAuth2 + Bot API（ロール付与） |
| hCaptcha | CAPTCHA（エンドユーザーの認証フロー） |
| Cloudflare | WAF・Under Attack Mode 常時 ON（サイト全体の前段。CAPTCHA とは別レイヤー） |
| ipinfo.io | IP ジオロケーション・ASN 取得 |
| gps-coordinates.net | GPS 逆ジオコーディング |
| Telegram Bot API | 通知（Post-MVP） |
