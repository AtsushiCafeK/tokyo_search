#!/bin/bash
# ==============================================================================
# 警視庁メールデータ 日次自動更新スクリプト
# さくらインターネット レンタルサーバー用
#
# cron設定例（さくらコントロールパネル）:
#   5 6 * * * /bin/bash /home/hazimeru/www/tokyo_search/scripts/update_keishicho.sh
# ==============================================================================

set -euo pipefail

# ----------------------------------------------------------------
# 設定
# ----------------------------------------------------------------
# サーバー上の蓄積JSONパス（公開ディレクトリ内のdata/以下）
DATA_PATH="/home/hazimeru/www/tokyo_search/data/mail_keishicho.json"

# スクリプトが置かれているディレクトリ
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

log "===== 更新処理 開始 ====="

# ---- 1. 取得期間の計算 ----------------------------------------
# 蓄積JSONの最終send_atから3日前を開始日とする（遅延配信の取りこぼし防止）
export DATA_PATH
SDATE=$(python3 - <<'PYEOF'
import json, os, sys
from datetime import datetime, timedelta

data_path = os.environ.get('DATA_PATH', '')
try:
    with open(data_path, encoding='utf-8') as f:
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
curl -f -s --max-time 60 \
    -X POST "https://mail.keishicho.metro.tokyo.lg.jp/opendata/download" \
    -d "format=csv&sdate=${SDATE}&edate=${EDATE}&topic=&region=" \
    -o "${CSV_FILE}"

CSV_LINES=$(wc -l < "${CSV_FILE}")
log "ダウンロード完了: ${CSV_LINES} 行"

if [ "${CSV_LINES}" -le 1 ]; then
    log "新規データなし（ヘッダーのみ）。処理をスキップします。"
    exit 0
fi

# ---- 3. JSON変換・蓄積マージ -----------------------------------
log "JSON変換・マージ中..."
python3 "${SCRIPT_DIR}/csv_to_json.py" "${CSV_FILE}" "${DATA_PATH}" 2>&1 | tee -a "${LOG_FILE}"

# ---- 4. 作業用CSVを削除（ディスク節約）------------------------
rm -f "${CSV_FILE}"

log "===== 更新処理 完了 ====="
