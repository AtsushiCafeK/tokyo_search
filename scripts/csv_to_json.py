#!/usr/bin/env python3
"""
警視庁メールCSV → JSON変換・蓄積スクリプト
さくらインターネットのレンタルサーバー上で実行する。

使い方:
  python3 csv_to_json.py <CSVファイルパス> <蓄積JSONファイルパス>
"""

import csv
import json
import os
import sys
from datetime import datetime
from typing import List


def parse_send_to(send_to_raw: str, send_by: str) -> List[str]:
    """配信先文字列を配列に変換（「・」「、」区切り対応）"""
    if not send_to_raw:
        return [send_by] if send_by else []
    items = [s.strip() for s in send_to_raw.replace('・', '、').split('、')]
    result = [s for s in items if s]
    return result if result else ([send_by] if send_by else [])


def load_csv(csv_path: str) -> List[dict]:
    """CSVを読み込んでレコードリストに変換"""
    records = []

    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            send_at  = row.get('配信日時', '').strip()
            subject  = row.get('配信表題', '').strip()
            message  = row.get('配信本文', '').replace('\r\n', '\n').replace('\r', '\n').strip()
            send_by  = row.get('配信元', '').strip()
            send_to  = parse_send_to(row.get('配信先', ''), send_by)

            if not send_at or not subject:
                continue

            records.append({
                'send_at':  send_at,
                'subject':  subject,
                'message':  message,
                'send_by':  send_by,
                'send_to':  send_to,
            })

    return records


def load_accumulated(json_path: str) -> List[dict]:
    """蓄積JSONを読み込む（存在しない場合は空リスト）"""
    if not os.path.exists(json_path):
        return []
    try:
        with open(json_path, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f'警告: 蓄積JSONの読み込みに失敗（新規作成します）: {e}', file=sys.stderr)
        return []


def merge(new_records: List[dict], existing: List[dict]) -> List[dict]:
    """新規レコードを既存データにマージ（重複除去・新規優先）"""
    def key(r):
        return f"{r['send_at']}__{r['subject']}"

    merged = {key(r): r for r in existing}

    added = 0
    updated = 0
    for r in new_records:
        k = key(r)
        if k not in merged:
            added += 1
        else:
            updated += 1
        merged[k] = r  # 新規データで上書き

    print(f'  追加: {added} 件 / 更新: {updated} 件 / 既存維持: {len(existing) - updated} 件')

    result = sorted(merged.values(), key=lambda r: r['send_at'])
    return result


def main():
    if len(sys.argv) != 3:
        print(f'使い方: {sys.argv[0]} <CSVファイル> <蓄積JSONファイル>', file=sys.stderr)
        sys.exit(1)

    csv_path  = sys.argv[1]
    json_path = sys.argv[2]

    print(f'[{datetime.now():%Y-%m-%d %H:%M:%S}] CSV読み込み: {csv_path}')
    new_records = load_csv(csv_path)
    print(f'  → {len(new_records)} 件')

    print(f'[{datetime.now():%Y-%m-%d %H:%M:%S}] 蓄積JSON読み込み: {json_path}')
    existing = load_accumulated(json_path)
    print(f'  → {len(existing)} 件')

    print(f'[{datetime.now():%Y-%m-%d %H:%M:%S}] マージ処理中...')
    merged = merge(new_records, existing)
    print(f'  → マージ後合計: {len(merged)} 件')

    os.makedirs(os.path.dirname(os.path.abspath(json_path)), exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f'[{datetime.now():%Y-%m-%d %H:%M:%S}] 保存完了: {json_path}')


if __name__ == '__main__':
    main()
