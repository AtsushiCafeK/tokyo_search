#!/usr/bin/env python3
"""
警察庁「特殊詐欺の認知・検挙状況等について」CSVから、
手口別の最新期の認知件数・被害総額をランキング化して
public/data/fraud_ranking.json に書き出すスクリプト。

データ出典（PDL1.0準拠・出典明記で再配布可）:
  警察庁 特殊詐欺統計
  https://www.npa.go.jp/publications/statistics/sousa/sagi.html
  CSV: https://www.npa.go.jp/bureau/criminal/souni/tokusyusagi/hurikomesagi_toukei.csv

使い方:
  python3 fetch_fraud_ranking.py <出力JSONパス>

CSV構造（2026-06時点）:
  - Shift_JIS。手口ごとのセクション積み。
  - セクション見出し: 第1列が「１　特殊詐欺」「２－１　ＳＮＳ型投資詐欺」等（全角数字＋全角空白＋手口名）。
  - 各セクション内、最初に出る「認知件数」行が最新期。合計値は第5列(index4)、第6列以降が月別。
  - 「１　特殊詐欺」は全手口の合計（ランキングには入れず total として扱う）。
"""

import csv
import io
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta

CSV_URL = "https://www.npa.go.jp/bureau/criminal/souni/tokusyusagi/hurikomesagi_toukei.csv"
SOURCE_LABEL = "警察庁ウェブサイト「特殊詐欺の認知・検挙状況等について」"
SOURCE_URL = "https://www.npa.go.jp/publications/statistics/sousa/sagi.html"
JST = timezone(timedelta(hours=9))

# セクション見出し: 全角/半角数字（＋枝番）＋任意の(枝番)＋全角空白＋手口名
# 例: 「１　特殊詐欺」「２－１　ＳＮＳ型投資詐欺」「２－４(1)　オレオレ詐欺」
HEADER_RE = re.compile(r'^[0-9０-９]+(?:[－-][0-9０-９]+)?(?:[（(][0-9０-９]+[)）])?　\s*(\S.*)$')

# 手口名 → 安定したキー（英字slug）
METHOD_KEYS = {
    "特殊詐欺": "all",
    "ＳＮＳ型投資詐欺": "sns_investment",
    "ＳＮＳ型ロマンス詐欺": "sns_romance",
    "ニセ警察詐欺": "fake_police",
    "オレオレ詐欺": "oreore",
    "預貯金詐欺": "deposit",
    "架空料金請求詐欺": "billing",
    "融資保証金詐欺": "loan_guarantee",
    "還付金詐欺": "refund",
    "金融商品詐欺": "financial_product",
    "ギャンブル詐欺": "gambling",
    "交際あっせん詐欺": "matchmaking",
    "キャッシュカード詐欺盗": "cashcard_theft",
    "その他の特殊詐欺": "other",
}


def fetch_csv_text() -> str:
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "hazimeru-net/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    # 警察庁CSVは Shift_JIS（cp932）
    return raw.decode("cp932", errors="replace")


def to_int(s: str):
    s = (s or "").replace(",", "").replace("，", "").strip()
    if s in ("", "-", "－", "−"):
        return None
    try:
        return int(s)
    except ValueError:
        return None


def parse_ranking(csv_text: str):
    rows = list(csv.reader(io.StringIO(csv_text)))

    # 最新期ラベル（例: 令和8年1月～4月）をファイル冒頭から推定
    head = "".join(c for r in rows[:3] for c in r)
    m_year = re.search(r'令和[0-9０-９元]+年', head)
    m_range = re.search(r'[0-9０-９]+月\s*[～~]\s*[0-9０-９]+月', head)
    period = (m_year.group(0) if m_year else "") + (m_range.group(0) if m_range else "")
    period = period or "最新期"

    methods = []   # サブ手口
    total = None   # 特殊詐欺 合計

    current = None         # 現在のセクション名
    seen_ninchi = False    # そのセクションで最初の認知件数を取得済みか
    seen_higai = False

    for row in rows:
        if not row:
            continue
        c0 = (row[0] or "").strip()

        hm = HEADER_RE.match(c0)
        if hm:
            name = hm.group(1).strip()
            if name in METHOD_KEYS:
                current = name
                seen_ninchi = False
                seen_higai = False
            else:
                current = None
            continue

        if current is None:
            continue

        label = c0
        val_col = row[4] if len(row) > 4 else ""

        if label == "認知件数" and not seen_ninchi:
            seen_ninchi = True
            count = to_int(val_col)
            entry = {
                "methodKey": METHOD_KEYS[current],
                "methodName": current,
                "count": count,
                "amountYen": None,
                "period": period,
            }
            if current == "特殊詐欺":
                total = entry
            else:
                methods.append(entry)

        elif ("被害" in label and "単位：円" in label) and not seen_higai:
            seen_higai = True
            amount = to_int(val_col)
            target = total if current == "特殊詐欺" else (methods[-1] if methods else None)
            if target is not None:
                target["amountYen"] = amount

    # 認知件数の多い順にランキング
    methods = [m for m in methods if m["count"] is not None]
    methods.sort(key=lambda x: x["count"], reverse=True)
    for i, m in enumerate(methods, 1):
        m["rank"] = i

    return period, total, methods


def main():
    if len(sys.argv) < 2:
        print(f"使い方: {sys.argv[0]} <出力JSONパス>", file=sys.stderr)
        sys.exit(1)
    out_path = sys.argv[1]

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] CSV取得: {CSV_URL}")
    text = fetch_csv_text()
    period, total, methods = parse_ranking(text)

    if not methods:
        print("エラー: 手口が1件も抽出できませんでした。CSVレイアウト変更の可能性。JSONは更新しません。", file=sys.stderr)
        sys.exit(2)

    out = {
        "generated_at": datetime.now(JST).isoformat(timespec="seconds"),
        "source": SOURCE_LABEL,
        "sourceUrl": SOURCE_URL,
        "period": period,
        "total": total,
        "items": [
            {"rank": m["rank"], "methodKey": m["methodKey"], "methodName": m["methodName"],
             "count": m["count"], "amountYen": m["amountYen"], "period": period}
            for m in methods
        ],
    }

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now(JST):%Y-%m-%d %H:%M:%S}] 保存: {out_path}")
    print(f"  期間: {period} / 手口: {len(methods)} 件" + (f" / 合計認知 {total['count']}" if total else ""))
    for m in methods:
        print(f"   {m['rank']:>2}. {m['methodName']}  認知 {m['count']}  被害 {m['amountYen']}")


if __name__ == "__main__":
    main()
