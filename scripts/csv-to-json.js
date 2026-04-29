const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '../import_csv');
const JSON_DIR = path.join(__dirname, '../import_json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/mail_keishicho.json');

// RFC 4180準拠のCSVパーサー（日本語・改行込みフィールド対応）
function parseCsv(content) {
    const records = [];
    let i = 0;
    const len = content.length;

    // BOMを除去
    if (content.charCodeAt(0) === 0xFEFF) i = 1;

    while (i < len) {
        const fields = [];

        while (i < len) {
            if (content[i] === '"') {
                // クォートフィールド
                i++;
                let field = '';
                while (i < len) {
                    if (content[i] === '"') {
                        if (i + 1 < len && content[i + 1] === '"') {
                            field += '"';
                            i += 2;
                        } else {
                            i++;
                            break;
                        }
                    } else {
                        field += content[i++];
                    }
                }
                fields.push(field);
            } else {
                // 非クォートフィールド
                let field = '';
                while (i < len && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
                    field += content[i++];
                }
                fields.push(field);
            }

            if (i < len && content[i] === ',') {
                i++;
            } else {
                break;
            }
        }

        // 行末(\r\n or \n)をスキップ
        if (i < len && content[i] === '\r') i++;
        if (i < len && content[i] === '\n') i++;

        if (fields.length > 0 && !(fields.length === 1 && fields[0] === '')) {
            records.push(fields);
        }
    }

    return records;
}

// CSVレコード → JSONオブジェクト変換
// ヘッダー: 配信日時,配信表題,配信本文,配信元,配信先
function convertRecord(fields) {
    const [send_at, subject, message, send_by, send_to_raw] = fields;

    if (!send_at || !subject) return null;

    // 配信先を配列化（「・」「、」区切りに対応）
    const send_to = (send_to_raw || send_by || '')
        .split(/[・、]/)
        .map(s => s.trim())
        .filter(Boolean);

    if (send_to.length === 0) send_to.push(send_by || '');

    return {
        send_at: send_at.trim(),
        subject: subject.trim(),
        message: (message || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim(),
        send_by: send_by.trim(),
        send_to,
    };
}

function loadCsvFiles() {
    const csvFiles = fs.readdirSync(CSV_DIR)
        .filter(f => f.toLowerCase().endsWith('.csv'))
        .sort();

    if (csvFiles.length === 0) {
        console.log(`CSVファイルが見つかりません: ${CSV_DIR}`);
        return [];
    }

    const allRecords = [];
    for (const file of csvFiles) {
        const filePath = path.join(CSV_DIR, file);
        console.log(`CSV読み込み中: ${file}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const rows = parseCsv(content);

        // 1行目はヘッダーとしてスキップ
        let skipped = 0;
        for (let i = 1; i < rows.length; i++) {
            const record = convertRecord(rows[i]);
            if (record) {
                allRecords.push(record);
            } else {
                skipped++;
            }
        }
        console.log(`  → ${rows.length - 1 - skipped} 件変換（スキップ: ${skipped} 件）`);
    }
    return allRecords;
}

function loadExistingJson() {
    const jsonPath = path.join(JSON_DIR, 'mail_keishicho.json');
    if (!fs.existsSync(jsonPath)) return [];

    try {
        console.log(`既存JSONを読み込み中: ${path.basename(jsonPath)}`);
        let content = fs.readFileSync(jsonPath, 'utf8');

        // 末尾の破損（HTMLタグ等）を除去
        const lastIndex = content.lastIndexOf(']');
        if (lastIndex !== -1) content = content.substring(0, lastIndex + 1);

        const data = JSON.parse(content);
        console.log(`  → ${data.length} 件読み込み`);
        return data;
    } catch (e) {
        console.warn(`既存JSONの読み込みをスキップ（エラー: ${e.message}）`);
        return [];
    }
}

function mergeAndDeduplicate(csvRecords, jsonRecords) {
    const key = r => `${r.send_at}__${r.subject}`;
    const seen = new Set();
    const merged = [];

    // CSV優先でマージ（CSVで上書き）
    for (const r of [...jsonRecords, ...csvRecords]) {
        const k = key(r);
        if (!seen.has(k)) {
            seen.add(k);
            merged.push(r);
        } else if (csvRecords.includes(r)) {
            // CSV側を優先して置換
            const idx = merged.findIndex(m => key(m) === k);
            if (idx !== -1) merged[idx] = r;
        }
    }

    // 配信日時で昇順ソート
    merged.sort((a, b) => a.send_at.localeCompare(b.send_at));
    return merged;
}

async function main() {
    console.log('--- CSVからJSONへの変換を開始します ---');

    const csvRecords = loadCsvFiles();
    const jsonRecords = loadExistingJson();

    console.log(`\nマージ処理中...（CSV: ${csvRecords.length} 件 + JSON: ${jsonRecords.length} 件）`);
    const merged = mergeAndDeduplicate(csvRecords, jsonRecords);
    console.log(`マージ後: ${merged.length} 件（重複除去済み）`);

    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`\n成功: ${OUTPUT_PATH} に保存しました`);
    console.log('--- 完了 ---');
}

main().catch(e => {
    console.error('致命的なエラー:', e);
    process.exit(1);
});
