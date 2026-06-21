#!/usr/bin/env python3
"""
公共交通オープンデータセンター(ODPT) 列車運行情報 取得・JSON書き出しスクリプト
さくらインターネットのレンタルサーバー上で cron 実行する。

使い方:
  ODPT_KEY=<コンシューマーキー> python3 fetch_train_delay.py <出力JSONパス> [<railways.jsonパス>]

毎回の処理:
  1. 現在の運行情報スナップショットを train_delay.json に上書き保存
  2. 「乱れ」をイベント単位(開始/終了/継続分/最大深刻度/原因)で
     train_delay_history.json に蓄積（遅延リスク可視化用）
  3. 遅延率の分母用に train_observation_log.json へ日別実行回数を記録

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


# 深刻度の重み（小さいほど重い）。最大深刻度の判定に使う。
SEVERITY = {"suspended": 0, "delay": 1, "other": 2}

# 開イベントを「停滞」とみなして強制終了するまでの時間（分）。
# cron欠損やODPTの取りこぼしで終了シグナルを取り損ねた場合の保険。
STALE_CLOSE_MIN = 180

# 原因キーワード → 区分。上から順に最初に一致したものを採用する。
CAUSE_RULES = [
    ("accident",   ("人身事故", "接触事故", "踏切事故", "衝突")),
    ("sick",       ("急病", "病人")),
    ("intrusion",  ("線路内", "立入", "支障", "障害物", "侵入")),
    ("crossing",   ("踏切",)),
    ("signal",     ("信号",)),
    ("vehicle",    ("車両点検", "車両故障", "車両トラブル", "ドア")),
    ("weather",    ("強風", "大雨", "大雪", "雪", "台風", "雨", "風", "倒木", "霧")),
    ("earthquake", ("地震",)),
    ("power",      ("停電", "架線", "電力")),
    ("congestion", ("混雑", "乗降")),
]


def classify_cause(text: str) -> str:
    """運行情報テキストから主な原因を推定する。"""
    t = text or ""
    for cause, keywords in CAUSE_RULES:
        if any(k in t for k in keywords):
            return cause
    return "other"


def _parse_dt(s: str):
    """ISO8601文字列を datetime に。失敗時 None。"""
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _duration_min(start: str, end: str):
    a, b = _parse_dt(start), _parse_dt(end)
    if a is None or b is None:
        return None
    return max(0, round((b - a).total_seconds() / 60))


def update_events(history_path: str, snapshot_items: list, now_iso: str) -> dict:
    """
    スナップショットから「遅延イベント」を開始/更新/終了して蓄積する。

    - 乱れ継続中で開イベントあり → 更新（lastSeen・最新テキスト・最大深刻度・原因）
    - 乱れ開始（開イベントなし）   → 新規イベントを開く
    - 正常復帰（開イベントあり）   → イベントを終了し継続時間を確定
    - 応答に現れない開イベントは触らない（後段の停滞クローズで処理）
    - lastSeen が STALE_CLOSE_MIN 以上前の開イベント → 停滞とみなし lastSeen で終了
    """
    # 既存イベントを読み込む
    events = []
    if os.path.exists(history_path):
        try:
            with open(history_path, encoding="utf-8") as f:
                data = json.load(f)
                events = data.get("events", []) if isinstance(data, dict) else data
        except Exception as e:
            print(f"  警告: 履歴JSONの読み込みに失敗（新規作成します）: {e}", file=sys.stderr)

    # 路線 → 開いているイベント（終了していないもの）
    open_by_railway = {}
    for ev in events:
        if ev.get("endAt") is None:
            open_by_railway[ev.get("railway")] = ev

    now_dt = _parse_dt(now_iso)
    opened = updated = closed = 0

    # 現在の各路線の状態を反映
    for item in snapshot_items:
        railway = item.get("railway")
        category = classify_category(item.get("text", ""), item.get("status", ""))
        text = item.get("text", "")
        when = item.get("date") or now_iso
        open_ev = open_by_railway.get(railway)

        if category != "normal":
            if open_ev is None:
                # 新規イベント開始
                ev = {
                    "id": f"{railway}__{when}",
                    "railway": railway,
                    "operator": item.get("operator", ""),
                    "startAt": when,
                    "endAt": None,
                    "durationMin": None,
                    "maxCategory": category,
                    "cause": classify_cause(text),
                    "latestText": text,
                    "lastSeenAt": when,
                    "ongoing": True,
                }
                events.append(ev)
                open_by_railway[railway] = ev
                opened += 1
            else:
                # 継続中イベントを更新
                open_ev["lastSeenAt"] = when
                open_ev["latestText"] = text
                if SEVERITY.get(category, 9) < SEVERITY.get(open_ev.get("maxCategory"), 9):
                    open_ev["maxCategory"] = category
                # 原因が未確定(other)なら上書きを試みる
                if open_ev.get("cause") == "other":
                    open_ev["cause"] = classify_cause(text)
                updated += 1
        else:
            if open_ev is not None:
                # 正常復帰 → 終了確定
                open_ev["endAt"] = when
                open_ev["durationMin"] = _duration_min(open_ev["startAt"], when)
                open_ev["ongoing"] = False
                del open_by_railway[railway]
                closed += 1

    # 停滞クローズ：応答に現れず lastSeen が古い開イベントを終了
    if now_dt is not None:
        for ev in events:
            if ev.get("endAt") is None:
                last = _parse_dt(ev.get("lastSeenAt"))
                if last is not None and (now_dt - last).total_seconds() / 60 >= STALE_CLOSE_MIN:
                    ev["endAt"] = ev["lastSeenAt"]
                    ev["durationMin"] = _duration_min(ev["startAt"], ev["lastSeenAt"])
                    ev["ongoing"] = False
                    closed += 1

    events.sort(key=lambda e: e.get("startAt", ""))

    os.makedirs(os.path.dirname(os.path.abspath(history_path)), exist_ok=True)
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump({"generated_at": now_iso, "events": events}, f, ensure_ascii=False, indent=2)

    ongoing = sum(1 for e in events if e.get("endAt") is None)
    print(f"  履歴: 開始 {opened} / 更新 {updated} / 終了 {closed} / 継続中 {ongoing} / 累計 {len(events)} 件 → {history_path}")
    return {"opened": opened, "updated": updated, "closed": closed, "total": len(events)}


def update_observation_log(log_path: str, now_iso: str) -> None:
    """遅延率の分母用に、日別のcron実行回数を記録する。"""
    days = {}
    if os.path.exists(log_path):
        try:
            with open(log_path, encoding="utf-8") as f:
                data = json.load(f)
                days = data.get("days", {}) if isinstance(data, dict) else {}
        except Exception as e:
            print(f"  警告: 観測ログの読み込みに失敗（新規作成します）: {e}", file=sys.stderr)

    day = now_iso[:10]  # YYYY-MM-DD
    days[day] = int(days.get(day, 0)) + 1

    os.makedirs(os.path.dirname(os.path.abspath(log_path)), exist_ok=True)
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump({"generated_at": now_iso, "days": days}, f, ensure_ascii=False, indent=2)

    print(f"  観測ログ: {day} = {days[day]} 回目 → {log_path}")


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

    # ---- イベントベース履歴蓄積 ＋ 観測ログ ------------------------
    # スナップショットと同じディレクトリに蓄積ファイルを置く。
    out_dir = os.path.dirname(os.path.abspath(out_path))
    history_path = os.path.join(out_dir, "train_delay_history.json")
    log_path = os.path.join(out_dir, "train_observation_log.json")

    update_events(history_path, items, generated_at)
    update_observation_log(log_path, generated_at)

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] 完了")


if __name__ == "__main__":
    main()
