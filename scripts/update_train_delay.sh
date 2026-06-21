#!/bin/bash
# ==============================================================================
# 電車運行情報(ODPT) 取り込みスクリプト
# さくらインターネット レンタルサーバー用
#
# 公開ディレクトリの data/train_delay.json を約15分ごとに上書き更新する。
#
# cron設定例（さくらコントロールパネル / 15分間隔）:
#   */15 * * * * ODPT_KEY=xxxxxxxx /bin/bash /home/hazimeru/www/tokyo_search/scripts/update_train_delay.sh
#
# ※ ODPT_KEY（コンシューマーキー）はリポジトリに含めず、cron 行の環境変数として渡すこと。
#   さくらの cron でジョブごとに分刻み実行が可能かは要確認（不可なら最短間隔に合わせる）。
# ==============================================================================

set -euo pipefail

# ----------------------------------------------------------------
# 設定
# ----------------------------------------------------------------
# 公開ディレクトリ内の出力先JSON
OUT_PATH="/home/hazimeru/www/tokyo_search/data/train_delay.json"

# 路線マスター（サーバー上の配置に合わせて調整。リポジトリの src/data を配置している場合）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RAILWAYS_PATH="${SCRIPT_DIR}/railways.json"

# ログ
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/train_$(date '+%Y%m').log"
# ----------------------------------------------------------------

mkdir -p "${LOG_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

if [ -z "${ODPT_KEY:-}" ]; then
    log "エラー: 環境変数 ODPT_KEY が未設定です。処理を中止します。"
    exit 1
fi

# railways.json がスクリプトと同じ場所に無ければ引数を省略（python側の既定パスに委ねる）
if [ -f "${RAILWAYS_PATH}" ]; then
    python3 "${SCRIPT_DIR}/fetch_train_delay.py" "${OUT_PATH}" "${RAILWAYS_PATH}" 2>&1 | tee -a "${LOG_FILE}"
else
    python3 "${SCRIPT_DIR}/fetch_train_delay.py" "${OUT_PATH}" 2>&1 | tee -a "${LOG_FILE}"
fi
