#!/bin/bash
# ==============================================================================
# 警視庁メールデータ 日次自動更新スクリプト
# さくらインターネット レンタルサーバー用
#
# cron設定例（さくらコントロールパネル）:
#   5 6 * * * /bin/bash /home/<アカウント>/www/<公開フォルダ>/scripts/update_keishicho.sh
#
# 配置の前提:
#   <公開フォルダ>/scripts/update_keishicho.sh   ← このスクリプト
#   <公開フォルダ>/scripts/csv_to_json.py
#   <公開フォルダ>/data/mail_keishicho.json      ← 蓄積JSON（scripts と同じ階層の data/）
#
# Python は python3 を優先し、無ければ python（2.7 でも可）を使う。
# 明示したい場合は環境変数で指定できる:
#   PYTHON_BIN=/usr/local/bin/python3 bash update_keishicho.sh
# 蓄積JSONの場所を変える場合は環境変数 DATA_PATH で指定できる。
# ==============================================================================

set -euo pipefail

# cron は PATH が最小限なので、よく使う場所を補う
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# ----------------------------------------------------------------
# 設定
# ----------------------------------------------------------------
# スクリプトが置かれているディレクトリ
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 蓄積JSONのパス（既定: scripts と同じ階層の data/mail_keishicho.json）
DATA_PATH="${DATA_PATH:-${SCRIPT_DIR}/../data/mail_keishicho.json}"

# 作業用CSVの一時置き場（cronごとに上書きされる）
CSV_WORK_DIR="${SCRIPT_DIR}/csv_work"

# ログファイル
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/update_$(date '+%Y%m').log"
# ----------------------------------------------------------------

mkdir -p "${CSV_WORK_DIR}" "${LOG_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# 途中で失敗したとき、どの行で止まったかをログに残す（set -e で黙って終了しないように）
trap 'rc=$?; log "エラー終了: ${BASH_SOURCE[0]} の ${LINENO} 行目付近（終了コード ${rc}）"; exit ${rc}' ERR

log "===== 更新処理 開始 ====="

# ---- 0. 使う Python を決める ----------------------------------------
PYTHON_BIN="${PYTHON_BIN:-}"
if [ -z "${PYTHON_BIN}" ]; then
    for cand in python3 python3.8 python python2.7 python2; do
        if command -v "${cand}" >/dev/null 2>&1; then
            PYTHON_BIN="${cand}"
            break
        fi
    done
fi
if [ -z "${PYTHON_BIN}" ]; then
    log "エラー: python が見つかりません（PATH=${PATH}）。PYTHON_BIN で指定してください。"
    exit 1
fi
log "Python: $(command -v "${PYTHON_BIN}") ($(${PYTHON_BIN} --version 2>&1))"
log "蓄積JSON: ${DATA_PATH}"

# ---- 1. 取得期間の計算 ----------------------------------------
# 蓄積JSONの最終send_atから3日前を開始日とする（遅延配信の取りこぼし防止）
export DATA_PATH
SDATE=$("${PYTHON_BIN}" - <<'PYEOF'
# -*- coding: utf-8 -*-
import io, json, os
from datetime import datetime, timedelta

data_path = os.environ.get('DATA_PATH', '')
try:
    with io.open(data_path, encoding='utf-8') as f:
        data = json.load(f)
    last_date = sorted(d['send_at'] for d in data if d.get('send_at'))[-1]
    dt = datetime.strptime(last_date[:10], '%Y-%m-%d') - timedelta(days=3)
    print(dt.strftime('%Y%m%d'))
except Exception:
    # JSONがない・読めない場合は30日前から取得
    print((datetime.now() - timedelta(days=30)).strftime('%Y%m%d'))
PYEOF
)

EDATE=$(date -d '1 day ago' '+%Y%m%d' 2>/dev/null || date -v-1d '+%Y%m%d')  # Linux / macOS 両対応

log "取得期間: ${SDATE} → ${EDATE}"

# ---- 2. CSVダウンロード ----------------------------------------
CSV_FILE="${CSV_WORK_DIR}/maillog_${SDATE}_${EDATE}.csv"

log "CSVダウンロード中..."
# -S: エラー時は理由を表示（-s だけだと原因が分からない）。理由はログにも残す
curl -f -sS --max-time 60 \
    -X POST "https://mail.keishicho.metro.tokyo.lg.jp/opendata/download" \
    -d "format=csv&sdate=${SDATE}&edate=${EDATE}&topic=&region=" \
    -o "${CSV_FILE}" 2>> "${LOG_FILE}"

CSV_LINES=$(wc -l < "${CSV_FILE}")
log "ダウンロード完了: ${CSV_LINES} 行"

if [ "${CSV_LINES}" -le 1 ]; then
    log "新規データなし（ヘッダーのみ）。処理をスキップします。"
    exit 0
fi

# ---- 3. JSON変換・蓄積マージ -----------------------------------
log "JSON変換・マージ中..."
"${PYTHON_BIN}" "${SCRIPT_DIR}/csv_to_json.py" "${CSV_FILE}" "${DATA_PATH}" 2>&1 | tee -a "${LOG_FILE}"

# ---- 4. 作業用CSVを削除（ディスク節約）------------------------
rm -f "${CSV_FILE}"

log "===== 更新処理 完了 ====="
