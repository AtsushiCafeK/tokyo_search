const fs = require('fs');
const path = require('path');

/**
 * 警視庁「メールけいしちょう」JSONデータの末尾の破損（HTML混入等）を修復し、
 * publicフォルダに配置するスクリプト。
 */

const INPUT_PATH = path.join(__dirname, '../import_json/mail_keishicho.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/mail_keishicho.json');

async function cleanup() {
    console.log('--- データのクリーンアップを開始します ---');

    if (!fs.existsSync(INPUT_PATH)) {
        console.error(`エラー: 入力ファイルが見つかりません: ${INPUT_PATH}`);
        process.exit(1);
    }

    try {
        console.log(`ファイルを読み込み中: ${INPUT_PATH}`);
        let content = fs.readFileSync(INPUT_PATH, 'utf8');

        // 1. 末尾のHTMLタグなどの不要なデータを除去
        // JSON配列の終端 ']' よりも後ろにあるものをすべて削除
        const lastIndex = content.lastIndexOf(']');
        if (lastIndex !== -1) {
            console.log('末尾の不要なデータ（HTML等）を検知。除去します。');
            content = content.substring(0, lastIndex + 1);
        }

        // 2. 構文チェックとデータ加工
        console.log('JSON構文チェックとデータ加工を実行中...');
        try {
            let data = JSON.parse(content);
            console.log(`成功: 有効なJSONデータです（件数: ${data.length}件）`);

            // データ加工: message内の改行コードを正規化 (\r\n を \n に統一するなど)
            console.log('メッセージ内の改行コードを正規化しています...');
            data = data.map(item => {
                if (item.message) {
                    // \r\n を \n に変換し、連続する空行を整理したい場合はここで行う
                    item.message = item.message.replace(/\r\n/g, '\n').trim();
                }
                return item;
            });

            content = JSON.stringify(data, null, 2);
        } catch (parseError) {
            console.error('JSON処理エラー:', parseError.message);
            // ... (既存の修復ロジックは content が文字列のままの場合に備えて残すか、
            // すでに parse 失敗した時点で fatal にしても良いですが、
            // 念のため以前の簡易的な修復を試みる場合はここに残す)
            process.exit(1);
        }

        // 3. 出力先ディレクトリの確認
        const outputDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 4. 書き出し
        fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
        console.log(`成功: クリーニング済みのデータを保存しました: ${OUTPUT_PATH}`);

    } catch (error) {
        console.error('致命的なエラーが発生しました:', error);
        process.exit(1);
    }

    console.log('--- 完了 ---');
}

cleanup();
