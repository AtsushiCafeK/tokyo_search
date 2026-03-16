# out フォルダへのデプロイ手順

1. プロジェクトフォルダに移動
ターミナルを開いて以下を実行（すでに開いている場合はスキップ）：
bash
	cd ~/Desktop/GovSearch/gov_hachiouji

2. ビルド実行（out フォルダに出力）
bash
	npm run build
完了すると out/ フォルダに静的ファイルが生成されます（1〜2分程度）。

3. 確認（任意）
bash
	ls out/
index.html や alerts/ フォルダなどが生成されていればOKです。

⚠️ 注意点
コードを変更したら毎回 npm run build を実行してください。out/ は毎回上書きされます。
データを更新したい場合は先に npm run update-data を実行してから npm run build の順番で：

bash
	npm run update-data && npm run build
これだけです！難しいコマンドは一切ないので安心してください 😊 何かエラーが出た場合はメッセージをそのまま貼り付けてもらえれば対処します。

