# 引き継ぎ書

## 案件名
WhyWhy Sheet に「評価」機能と評価結果ページを追加

## 現在の到達点
- 設置予定のフロント公開先は `https://mettalun.github.io/whywhy2/`
- スタート画面、ガイダンス画面、なぜなぜ分析シート、評価ページの4画面構成は実装済み
- スタート画面はプレゼン版仕様に変更済み
  - `icon-512` 表示
  - パスワード入力欄
  - 送信ボタン
  - パスワードは `431830`
- パスワード認証後は使い方説明画面へ遷移
- 使い方説明画面の文言はプレゼン版仕様へ差し替え済み
- `はじめる` ボタン押下で `test-data.js` を自動ダウンロードし、そのまま体験画面へ遷移
- メイン画面には赤い `評価` ボタンを追加済み
- 評価ボタン押下で、現在のシート内容を整形して評価 API へ送信する処理を実装済み
- API 応答から JSON 抽出、JSON 検証、評価ページ表示を実装済み
- PWA 用 `manifest.json`、`service-worker.js`、アイコン設定は反映済み

## 主な変更ファイル
- `js/app_router.js`
- `js/evaluation.js`
- `js/pc/pc_app.js`
- `js/mobile/mobile_app.js`
- `js/mobile/mobile_map_view.js`
- `js/mobile/mobile_node_editor.js`
- `js/core/file_io.js`
- `js/presentation_test_data.js`
- `css/common.css`
- `index.html`
- `manifest.json`
- `service-worker.js`
- `server.js`
- `package.json`

## 実装済みの主要機能

### 1. 画面遷移
- `start`
  - パスワード認証入口
- `guidance`
  - プレゼン版の使い方説明
- `analysis`
  - 既存 WhyWhy Sheet 本体
- `evaluation`
  - 評価結果一覧

### 2. 評価フロー
- シートのツリー構造を自然文テキストへ整形
- 固定プロンプト + `analysisText` を OpenAI Responses API へ送信
- 応答文字列から JSON 部分だけを抽出
- 以下を検証
  - `result` の存在
  - `evaluations` が配列
  - 20件あること
  - `item_id` の順序
  - `rating` が許可値内
  - `overall_rating` が `A/B/C/D`
- 成功時は評価ページへ遷移
- 失敗時はエラーメッセージ表示

### 3. テストデータ配布
- `js/presentation_test_data.js` に体験用データを追加済み
- `はじめる` ボタンで `test-data.js` をダウンロードする
- 読み込み側は `.json` だけでなく `.js` も選択可能に変更済み

### 4. PWA
- `image/icom64.png`
- `image/icom256.png`
- `image/icom512.png`
を利用するよう設定済み

## ローカル確認済み事項
- ローカルでのテスト、調整は終了済み
- `3001` 番ポートで評価サーバーを起動できることを確認
- `api/health` が応答することを確認
- OpenAI API キーを設定すれば評価サーバーが `hasOpenAiKey: true` になることを確認

## 次スレッドでやること
ネット環境用調整が未完了。ここが今回の引き継ぎポイント。

### 優先対応項目
1. フロントから評価 API を呼ぶ接続先の最終確定
- 現状は環境差吸収のためフォールバックを持っている
- フロント公開先は `https://mettalun.github.io/whywhy2/` を前提にする
- 実運用ネットワークで
  - どのホスト名でアプリを開くか
  - 評価 API をどのホスト / ポートで公開するか
を確定する必要がある
- GitHub Pages は静的配信のみのため、`server.js` は同居できない
- そのため評価 API は別ホストで公開する前提になる
- 現時点の方針は、フロントを `https://mettalun.github.io/whywhy2/` で公開し、評価 API は `https://api.rq-inn.com/whywhy2/api/whywhy/evaluate` を使う構成

2. `server.js` の公開方法整理
- 現在は `0.0.0.0:3001` で待ち受ける実装
- 実ネットワーク環境で以下を確認すること
  - 同一端末アクセス
  - 別端末アクセス
  - ファイアウォール
  - ポート開放可否
  - HTTPS 配下からのアクセス要件
- 特に GitHub Pages は `https` 配信なので、フロントから `http://...:3001` を直接呼ぶと mixed content で遮断される可能性が高い
- 実運用では評価 API 側も `https` 公開、もしくは `https` のリバースプロキシ配下に置く方針が必要

3. フロント接続先の固定化
- 必要なら `js/evaluation.js` の API 接続先候補ロジックを整理する
- ネットワーク構成が固まったら
  - 同一オリジンで統一
  - または固定の API ベース URL に統一
のどちらかへ寄せるのが望ましい
- GitHub Pages 配下では同一オリジンに Node API を置けないため、実質的には「固定の HTTPS API ベース URL に統一」が有力
- 現在のフロントは HTTPS 配下では `https://api.rq-inn.com/whywhy2/api/whywhy/evaluate` を優先して呼ぶ実装
- つまり GitHub Pages 側の公開 URL を `https://mettalun.github.io/whywhy2/` にしても、評価通信は `api.rq-inn.com` 側へ送る

4. OpenAI API キー運用整理
- 会話内で一度キー共有が行われた
- 実運用前に必ずキーをローテーションすること
- `.env` や起動スクリプト等で安全に管理する方針を決めること

## 注意点
- `localhost` / `127.0.0.1` は、表示しているブラウザの実行環境を指す
- 別端末や別ホスト経由でページを開く場合、評価 API 側のホスト指定がずれると `ERR_CONNECTION_REFUSED` になりやすい
- `https://mettalun.github.io/whywhy2/` からは `http://127.0.0.1:3001` や `http://<LAN-IP>:3001` への直接通信はブラウザ制約で失敗しやすい
- `Live Server` のような静的配信と、評価用 Node サーバーは別物
- 実運用では
  - 静的配信
  - 評価 API
をどう束ねるか決めた方が安定する

## 次スレッドで見るべきファイル
- `js/evaluation.js`
- `server.js`
- `js/app_router.js`
- `service-worker.js`
- `manifest.json`

## 補足
- プレゼン版文言、パスワード、体験データ導線はすでに反映済み
- 次スレッドでは UI 改修よりも通信経路と公開方法の整理が主眼
- `manifest.json` と `service-worker.js` は相対パス中心なので、`/whywhy2/` 配下の静的設置自体には比較的乗せやすい
- 一方で評価機能だけは別系統の API 公開方法を先に決めないと本番動作確認が進まない
