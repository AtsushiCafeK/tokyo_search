#!/usr/bin/env python3
"""
公共交通オープンデータセンター(ODPT) 列車運行情報 取得・JSON書き出しスクリプト
さくらインターネットのレンタルサーバー上で cron 実行する。

使い方:
  ODPT_KEY=<コンシューマーキー> python3 fetch_train_delay.py <出力JSONパス> [<railways.jsonパス>]

第1段階: 現在の運行情報スナップショットを毎回「上書き」保存する。
（第2段階で履歴蓄積マージへ拡張する想定。merge的な処理はここに足せばよい）

ODPT 利用にあたっては開発者登録(無料)とコンシューマーキーが必要。
キーはリポジトリに含めず、cron の環境変数として渡すこと。
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

# ODPT API v4 エンドポイント
ODPT_ENDPOINT = "https://api.odpt.org/api/v4/odpt:TrainInformation"

JST = timezone(timedelta(hours=9))


def load_railways(railways_path: str) -> list:
    """路線マスター(railways.json)を読み込む。対象路線/事業者の絞り込みに使う。"""
    with open(railways_path, encoding="utf-8") as f:
        return json.load(f)


def fetch_operator(operator_id: str, key: str) -> list:
    """指定事業者の運行情報を取得する。失敗時は空リストを返す（他事業者の取得を止めない）。"""
    params = urllib.parse.urlencode({
        "odpt:operator": operator_id,
        "acl:consumerKey": key,
    })
    url = f"{ODPT_ENDPOINT}?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "hazimeru-net/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  警告: {operator_id} の取得に失敗: {e}", file=sys.stderr)
        return []


def extract_text(info: dict) -> str:
    """odpt:trainInformationText から日本語テキストを取り出す。"""
    text = info.get("odpt:trainInformationText", "")
    if isinstance(text, dict):
        return (text.get("ja") or text.get("en") or "").strip()
    return (text or "").strip()


def main():
    if len(sys.argv) < 2:
        print(f"使い方: {sys.argv[0]} <出力JSONパス> [<railways.jsonパス>]", file=sys.stderr)
        sys.exit(1)

    out_path = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # 既定の railways.json はリポジトリの src/data を見る（サーバー配置に合わせて引数で上書き可）
    railways_path = sys.argv[2] if len(sys.argv) >= 3 else os.path.join(
        script_dir, "..", "src", "data", "railways.json"
    )

    key = os.environ.get("ODPT_KEY", "").strip()
    if not key:
        print("エラー: 環境変数 ODPT_KEY が未設定です。", file=sys.stderr)
        sys.exit(1)

    railways = load_railways(railways_path)
    target_railway_ids = {r["id"] for r in railways}
    operator_ids = sorted({r["operator"] for r in railways})

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] 取得対象: {len(operator_ids)} 事業者 / {len(target_railway_ids)} 路線")

    items = []
    for op in operator_ids:
        infos = fetch_operator(op, key)
        for info in infos:
            railway = info.get("odpt:railway")
            # マスターに無い路線（支線など）はスキップ
            if railway not in target_railway_ids:
                continue
            items.append({
                "railway": railway,
                "operator": info.get("odpt:operator", op),
                "text": extract_text(info),
                "status": (info.get("odpt:trainInformationStatus") or {}).get("ja", "")
                if isinstance(info.get("odpt:trainInformationStatus"), dict)
                else (info.get("odpt:trainInformationStatus") or ""),
                "date": info.get("dc:date", ""),
            })
        print(f"  {op}: {sum(1 for i in items if i['operator'] == op)} 件")

    output = {
        "generated_at": datetime.now(JST).isoformat(timespec="seconds"),
        "items": items,
    }

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] 保存完了: {out_path}（{len(items)} 件）")


if __name__ == "__main__":
    main()
