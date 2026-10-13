#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
警視庁メールCSV → JSON変換・蓄積スクリプト
さくらインターネットのレンタルサーバー上で実行する。

Python 2.7 / Python 3 の両方で動作する（サーバーのPythonが2.7のみの場合に対応）。

使い方:
  python csv_to_json.py <CSVファイルパス> <蓄積JSONファイルパス>
"""

from __future__ import print_function, unicode_literals

import codecs
import csv
import io
import json
import os
import sys
from datetime import datetime

PY2 = sys.version_info[0] == 2

if PY2:
    # cron でパイプ(tee)に流すと stdout の文字コードが ASCII になり、
    # 日本語の print で UnicodeEncodeError になるため UTF-8 に固定する。
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout)
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr)


def now_str():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def to_text(value):
    """バイト列なら UTF-8 でデコードして文字列にする（Python 2 用）。"""
    if value is None:
        return ''
    if isinstance(value, bytes):
        return value.decode('utf-8')
    return value


def to_text_path(path):
    """コマンドライン引数（Python 2 ではバイト列）を文字列にする。"""
    if isinstance(path, bytes):
        return path.decode(sys.getfilesystemencoding() or 'utf-8')
    return path


def parse_send_to(send_to_raw, send_by):
    """配信先文字列を配列に変換（「・」「、」区切り対応）"""
    if not send_to_raw:
        return [send_by] if send_by else []
    items = [s.strip() for s in send_to_raw.replace('・', '、').split('、')]
    result = [s for s in items if s]
    return result if result else ([send_by] if send_by else [])


def read_csv_rows(csv_path):
    """CSVを1行ずつ dict（キー・値とも文字列）で返す。Python 2/3 両対応。"""
    if PY2:
        # Python 2 の csv はバイト列を扱うため、BOM を除いて読み、各項目を後でデコードする
        with open(csv_path, 'rb') as f:
            data = f.read()
        if data.startswith(codecs.BOM_UTF8):
            data = data[len(codecs.BOM_UTF8):]
        reader = csv.DictReader(io.BytesIO(data))
        for row in reader:
            yield dict(
                (to_text(k), to_text(v))
                for k, v in row.items()
                if k is not None and not isinstance(v, list)
            )
    else:
        with open(csv_path, encoding='utf-8-sig', newline='') as f:
            for row in csv.DictReader(f):
                yield dict((k, to_text(v)) for k, v in row.items() if k is not None)


def load_csv(csv_path):
    """CSVを読み込んでレコードリストに変換"""
    records = []

    for row in read_csv_rows(csv_path):
        send_at = row.get('配信日時', '').strip()
        subject = row.get('配信表題', '').strip()
        message = row.get('配信本文', '').replace('\r\n', '\n').replace('\r', '\n').strip()
        send_by = row.get('配信元', '').strip()
        send_to = parse_send_to(row.get('配信先', ''), send_by)

        if not send_at or not subject:
            continue

        records.append({
            'send_at': send_at,
            'subject': subject,
            'message': message,
            'send_by': send_by,
            'send_to': send_to,
        })

    return records


def load_accumulated(json_path):
    """蓄積JSONを読み込む（存在しない場合は空リスト）。

    ファイルがあるのに読めない場合は、空から作り直して蓄積データを
    上書きしてしまわないよう、エラーで終了する。
    """
    if not os.path.exists(json_path):
        return []
    try:
        with io.open(json_path, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print('エラー: 蓄積JSONの読み込みに失敗しました。上書きを避けるため処理を中止します: {0}'.format(e),
              file=sys.stderr)
        sys.exit(2)


def merge(new_records, existing):
    """新規レコードを既存データにマージ（重複除去・新規優先）"""
    def key(r):
        return '{0}__{1}'.format(r['send_at'], r['subject'])

    merged = dict((key(r), r) for r in existing)

    added = 0
    updated = 0
    for r in new_records:
        k = key(r)
        if k not in merged:
            added += 1
        else:
            updated += 1
        merged[k] = r  # 新規データで上書き

    print('  追加: {0} 件 / 更新: {1} 件 / 既存維持: {2} 件'.format(
        added, updated, len(existing) - updated))

    return sorted(merged.values(), key=lambda r: r['send_at'])


def save_json(json_path, records):
    """JSONを保存する。

    全文を先にメモリ上で組み立ててから、一時ファイルに書き出して置き換える。
    途中で失敗しても、既存の蓄積JSONが壊れない。
    """
    # Python 2/3 で出力が同じになるよう separators を固定する
    text = json.dumps(records, ensure_ascii=False, indent=2, separators=(',', ': '))
    if isinstance(text, bytes):
        text = text.decode('utf-8')

    out_dir = os.path.dirname(os.path.abspath(json_path))
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)

    tmp_path = json_path + '.tmp'
    with io.open(tmp_path, 'w', encoding='utf-8') as f:
        f.write(text)
    if os.name == 'nt' and os.path.exists(json_path):
        os.remove(json_path)  # Windows は rename 先が存在すると失敗する（ローカル確認用）
    os.rename(tmp_path, json_path)


def main():
    if len(sys.argv) != 3:
        print('使い方: {0} <CSVファイル> <蓄積JSONファイル>'.format(sys.argv[0]), file=sys.stderr)
        sys.exit(1)

    csv_path = to_text_path(sys.argv[1])
    json_path = to_text_path(sys.argv[2])

    print('[{0}] CSV読み込み: {1}'.format(now_str(), csv_path))
    new_records = load_csv(csv_path)
    print('  → {0} 件'.format(len(new_records)))

    print('[{0}] 蓄積JSON読み込み: {1}'.format(now_str(), json_path))
    existing = load_accumulated(json_path)
    print('  → {0} 件'.format(len(existing)))

    print('[{0}] マージ処理中...'.format(now_str()))
    merged = merge(new_records, existing)
    print('  → マージ後合計: {0} 件'.format(len(merged)))

    save_json(json_path, merged)

    print('[{0}] 保存完了: {1}'.format(now_str(), json_path))


if __name__ == '__main__':
    main()
