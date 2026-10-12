#!/bin/bash
# ==============================================================================
# 詐欺対策ページ用 ランキングデータ更新スクリプト
# さくらインターネット レンタルサーバー用
#
# 警察庁の特殊詐欺統計CSVから手口別ランキングJSONを生成し、
# 公開ディレクトリの data/fraud_ranking.json を上書きする。
#
# 注意: fraud_methods.json（手口の説明・初動・相談先）は人がレビュー・編集する
#       コンテンツ本体のため、本スクリプトでは更新しない（上書きしない）。
#
# cron設定例（さくらコントロールパネル / 週1回 月曜 6:20 想定）:
#   20 6 * * 1 bash /home/hazimeru/www/tokyo_search/scripts/update_fraud.sh
# ==============================================================================

set -euo pipefail

OUT_PATH="/home/hazimeru/www/tokyo_search/data/fraud_ranking.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/fraud_$(date '+%Y%m').log"

mkdir -p "${LOG_DIR}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"; }

log "===== 詐欺ランキング更新 開始 ====="
# スクリプトが0件抽出時は非ゼロ終了し、既存JSONを壊さない（fetch側で制御）
python3 "${SCRIPT_DIR}/fetch_fraud_ranking.py" "${OUT_PATH}" 2>&1 | tee -a "${LOG_FILE}"
log "===== 詐欺ランキング更新 完了 ====="
