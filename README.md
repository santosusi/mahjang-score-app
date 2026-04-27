# 麻雀点数計算アプリ

手牌を選択するだけで符・翻・点数を自動計算するWebアプリです。

## 機能

- 萬子・筒子・索子・字牌を画面上の牌UIから選択して入力
- ロン／ツモ、親／子の切り替え
- ドラ・赤ドラ・裏ドラの枚数入力
- リーチ・一発の選択
- 符・翻・点数の自動計算（満貫・跳満・役満対応）
- 役の自動判定（平和・断么九・七対子・国士無双など主要役に対応）
- アガり結果をMySQLに記録
- 直近の最高役と役ごとの出現回数を表示

## 使用技術

- HTML / CSS / JavaScript
- PHP 8.x
- MySQL 8.x
- Apache（MAMP）

## 動作環境

- PHP 7.4以上
- MySQL 5.7以上（またはMariaDB 10.3以上）
- Apache / Nginx

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/santosusi/mahjang-score-app.git
cd mahjang-score-app
```

### 2. データベースを作成

MySQLにログインして以下のSQLを実行してください。

```sql
CREATE DATABASE mahjang_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mahjang_app;

CREATE TABLE agari_records (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  hand        JSON        NOT NULL,
  yaku        JSON        NOT NULL,
  han         INT         NOT NULL,
  fu          INT         NOT NULL,
  total_score INT         NOT NULL,
  fu_han_text VARCHAR(50) NOT NULL,
  agari_type  VARCHAR(10) NOT NULL,
  oyako       VARCHAR(5)  NOT NULL,
  is_yakuman  TINYINT(1)  NOT NULL DEFAULT 0,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE yaku_stats (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  yaku_name  VARCHAR(50) NOT NULL UNIQUE,
  count      INT         NOT NULL DEFAULT 0,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE agari_count (
  id    INT PRIMARY KEY DEFAULT 1,
  total INT NOT NULL DEFAULT 0
);

INSERT INTO agari_count (id, total) VALUES (1, 0);
```

### 3. DB接続設定

`api/db.sample.php` を `api/db.php` にコピーして、接続情報を入力してください。

```bash
cp api/db.sample.php api/db.php
```

`api/db.php` を開いて以下を編集します。

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'mahjang_app');
define('DB_USER', 'your_username'); // MySQLのユーザー名
define('DB_PASS', 'your_password'); // MySQLのパスワード
```

### 4. Webサーバーに配置

プロジェクトフォルダをWebサーバーのドキュメントルートに配置してください。

**MAMPの場合**
```
/Applications/MAMP/htdocs/mahjang/
```

ブラウザで以下にアクセスして動作確認します。
```
http://localhost:8888/mahjang/
```

## 画面イメージ

- 牌を選択 → 点数を計算する → 結果が表示される
- 「この結果を記録する」ボタンでDBに保存
- ページ下部に最高役・役の出現回数が表示される

## 注意事項

- `api/db.php` にはDB接続情報が含まれるため `.gitignore` で管理対象外にしています
- 本番環境では必ず強いパスワードを設定してください
