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


def classify_category(text: str, status: str = "") -> str:
    """運行情報テキスト/状況から区分を判定する（trainApi.ts の classifyStatus と同じ規則）。"""
    t = f"{status or ''} {text or ''}"
    if any(k in t for k in ("見合わせ", "運転中止", "運休", "運転を見合")):
        return "suspended"
    if any(k in t for k in ("遅延", "遅れ", "直通運転中止", "一部列車")):
        return "delay"
    if "平常" in t or "通常" in t or t.strip() == "":
        return "normal"
    return "other"


def merge_history(history_path: str, new_items: list, generated_at: str) -> int:
    """
    「乱れ」レコードを履歴JSONにマージ蓄積する（重複除去・新規優先）。
    キー = 路線ID + dc:date（情報が更新されるたび date が変わるので 1更新=1レコード）。
    けいしちょうの蓄積方式（send_at + subject キー）と同じ考え方。
    """
    # 蓄積対象は「平常運転」以外のみ
    disrupted = []
    for r in new_items:
        category = classify_category(r.get("text", ""), r.get("status", ""))
        if category == "normal":
            continue
        rec = dict(r)
        rec["category"] = category
        # dc:date が空のレコードは取得時刻で代用（キーが安定するように）
        if not rec.get("date"):
            rec["date"] = generated_at
        disrupted.append(rec)

    # 既存履歴を読み込む
    existing = []
    if os.path.exists(history_path):
        try:
            with open(history_path, encoding="utf-8") as f:
                data = json.load(f)
                existing = data.get("items", []) if isinstance(data, dict) else data
        except Exception as e:
            print(f"  警告: 履歴JSONの読み込みに失敗（新規作成します）: {e}", file=sys.stderr)

    def key(r):
        return f"{r.get('railway', '')}__{r.get('date', '')}"

    merged = {key(r): r for r in existing}
    added = 0
    for r in disrupted:
        k = key(r)
        if k not in merged:
            added += 1
        merged[k] = r  # 新規データで上書き

    result = sorted(merged.values(), key=lambda r: r.get("date", ""))

    os.makedirs(os.path.dirname(os.path.abspath(history_path)), exist_ok=True)
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump({"generated_at": generated_at, "items": result}, f, ensure_ascii=False, indent=2)

    print(f"  履歴: 追加 {added} 件 / 累計 {len(result)} 件 → {history_path}")
    return added


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

    generated_at = datetime.now(JST).isoformat(timespec="seconds")
    output = {
        "generated_at": generated_at,
        "items": items,
    }

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] スナップショット保存: {out_path}（{len(items)} 件）")

    # ---- 履歴蓄積（第2段階）----------------------------------------
    # スナップショットと同じディレクトリに train_delay_history.json を蓄積する。
    history_path = os.path.join(os.path.dirname(os.path.abspath(out_path)), "train_delay_history.json")
    merge_history(history_path, items, generated_at)

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] 完了")


if __name__ == "__main__":
    main()
