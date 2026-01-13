# CineGen AI Director (AI 漫劇工場)

> **産業用 AI モーションコミック & 動画生成ワークベンチ**
> *Industrial AI Motion Comic & Video Workbench*

The inspiration comes from the one-stop comic production platform [AniKuku AI Comic Production Platform](https://anikuku.com/?github).

> For business inquiries, questions, and communication, please contact me.

> cinegen@ullrai.com


**CineGen AI Director** は、**AI モーションコミック**、**縦読みマンガ動画**、および**映像絵コンテ (Animatic)** 制作のために設計されたプロフェッショナルツールです。

従来の「ガチャ」的な生成手法を捨て、**「脚本 -> アセット -> キーフレーム」** という産業用ワークフローを採用しています。Google Gemini 2.5 Flash と Veo モデルを深く統合することで、キャラクターの一貫性、シーンの連続性、そしてカメラワークの精密な制御を実現しました。

## 核となる概念：キーフレーム駆動 (Keyframe-Driven)

従来の Text-to-Video モデルでは、具体的なカメラの動きや開始・終了状態を制御することが困難でした。CineGen はアニメーション制作における **キーフレーム (Keyframe)** の概念を導入しました：

1.  **静止画先行**: まず、正確な開始フレーム (Start) と終了フレーム (End) を生成します。
2.  **補間生成**: Veo モデルを使用して、2つのフレーム間に滑らかな動画トランジションを生成します。
3.  **アセット制約**: すべての画面生成は「キャラクター設定画」と「シーンコンセプト画」によって厳密に制約され、キャラクターの崩壊を防ぎます。

## 主な機能

### Phase 01: 脚本とストーリーボード (Script & Storyboard)
*   **インテリジェントな分解**: 小説やあらすじを入力すると、AI が自動的に標準的な脚本構造（シーン、時間、雰囲気）に分解します。
*   **視覚的翻訳**: テキスト記述をプロ仕様の画像生成プロンプトに自動変換します。
*   **ペーシング制御**: 目標時間（例：30秒の予告編、3分の短編）を設定すると、AI がショット密度を自動調整します。

### Phase 02: アセットとキャスティング (Assets & Casting)
*   **一貫性のあるキャラクター**:
    *   各キャラクターの標準参照画像 (Reference Image) を生成します。
    *   **ワードローブシステム (Wardrobe System)**：ベースの顔立ちを維持したまま、複数の衣装（日常着、戦闘服、負傷状態など）を管理できます。
*   **美術設定 (Set Design)**：環境参照画像を生成し、同一シーン内の異なるショットでも照明や背景の統一性を保ちます。

### Phase 03: 監督ワークベンチ (Director Workbench)
*   **グリッド絵コンテ**: すべてのショットをパノラマビューで管理します。
*   **精密制御**:
    *   **Start Frame**: ショットの開始画面（強い一貫性）。
    *   **End Frame**: (オプション) ショット終了時の状態（例：振り返る、照明の変化）を定義します。
*   **コンテキスト認識**: AI がショットを生成する際、コンテキスト（現在のシーン画像 + キャラクターの特定の衣装画像）を自動的に読み込み、「シーンの不連続性」を完全に解決します。
*   **Veo 動画生成**: Image-to-Video モードと Keyframe Interpolation モードの両方をサポートしています。

### Phase 04: エクスポート (Export)
*   **タイムラインプレビュー**: 生成されたモーションコミックのセグメントをタイムライン形式でプレビューします。
*   **レンダリング追跡**: API レンダリングの進行状況をリアルタイムで監視します。
*   **アセット出力**: Premiere や After Effects での編集用に、すべての高解像度キーフレームと MP4 クリップを一括エクスポートできます。

## 技術スタック

*   **Frontend**: React 19, Tailwind CSS (Sony Industrial Design Style)
*   **AI Models**:
    *   **Logic/Text**: `gemini-2.5-flash` (脚本分析)
    *   **Vision**: `gemini-2.5-flash-image` (Nano Banana - 高速描画)
    *   **Video**: `veo-3.1-fast-generate-preview` (動画補間)
*   **Storage**: IndexedDB (ブラウザローカルデータベース、プライバシー重視、バックエンド不要)

## クイックスタート

1.  **キーの設定**: アプリを起動し、Google Gemini API Key を入力します（Veo を使用するには GCP の課金設定が必要です）。
2.  **ストーリー入力**: Phase 01 でストーリーのアイデアを入力し、「脚本生成」をクリックします。
3.  **美術設定**: Phase 02 に進み、キャラクターシートとシーンコンセプトを生成します。
4.  **ショット制作**: Phase 03 に進み、各ショットのキーフレームを生成します。
5.  **動画生成**: キーフレームを確認した後、動画クリップを一括生成します。

---
*Built for Creators, by CineGen.*
