"""Convert CSV exports of the old Google Sheet into a JSON file for the site's Import button.

Usage: python3 sheet_to_json.py <dir with books24.csv, ff24.csv, stats24.csv, ..., toread.csv> <out.json>
CSV export URL: https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&gid=<GID>
Чтобы перенести отметку «скачан» (курсив в названии фанфика), положите рядом ff24.html, ff25.html, ...:
https://docs.google.com/spreadsheets/d/<ID>/htmlview/sheet?headers=true&gid=<GID>
"""
import csv, json, re, sys, difflib, os
from html.parser import HTMLParser

MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август',
               'сентябрь', 'октябрь', 'ноябрь', 'декабрь']


def s(v):
    return re.sub(r'\s+', ' ', (v or '').strip())


def num(v):
    v = s(v).replace(',', '.')
    try:
        f = float(v)
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def flag(v):
    v = s(v).upper()
    return True if v == 'TRUE' else False if v == 'FALSE' else None


def month(v):
    v = s(v).lower()[:3]
    return MONTHS.index(v) + 1 if v in MONTHS else None


def date(v, year, book_month):
    m = re.match(r'^(\d{1,2})[./](\d{1,2})', s(v))
    if not m:
        return None
    d, mo = int(m.group(1)), int(m.group(2))
    y = year - 1 if mo == 12 and book_month and book_month <= 2 else year
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return None
    return f'{y:04d}-{mo:02d}-{d:02d}'


def period(rng, pub_year):
    """Bucket used by the stats sheet: century for <1700, 1700/1750, then decades."""
    r = num(rng)
    if isinstance(r, int) and ((10 <= r <= 17) or r in (1700, 1750) or (r >= 1800 and r % 10 == 0)):
        return r
    m = re.match(r'\d{3,4}', s(pub_year))
    if not m:
        return None
    y = int(m.group(0))
    if y < 1000:
        return 10
    if y < 1700:
        return y // 100 + 1
    if y < 1800:
        return 1700 if y < 1750 else 1750
    return y // 10 * 10


def norm(t):
    return s(t).lower().replace('ё', 'е')


def italic_titles(path):
    """Список (название, курсив?) по строкам листа из HTML-выгрузки Google Sheets."""
    h = open(path, encoding='utf-8').read()
    ital = {k for k, v in re.findall(r'\.(s\d+)\{([^}]*)\}', h) if 'font-style:italic' in v}

    class P(HTMLParser):
        def __init__(self):
            super().__init__(); self.rows = []; self.row = None; self.cell = None
        def handle_starttag(self, tag, a):
            a = dict(a)
            if tag == 'tr':
                self.row = []
            elif tag == 'td' and self.row is not None:
                self.cell = {'text': '', 'it': any(c in ital for c in (a.get('class') or '').split())}
            elif tag == 'span' and self.cell is not None and 'italic' in (a.get('style') or ''):
                self.cell['it'] = True
        def handle_endtag(self, tag):
            if tag == 'td' and self.cell is not None:
                self.row.append(self.cell); self.cell = None
            elif tag == 'tr' and self.row is not None:
                self.rows.append(self.row); self.row = None
        def handle_data(self, d):
            if self.cell is not None:
                self.cell['text'] += d

    p = P(); p.feed(h)
    hdr = next(r for r in p.rows if any(c['text'].strip() == 'название' for c in r))
    ti = [c['text'].strip() for c in hdr].index('название')
    return [(s(r[ti]['text']), r[ti]['it']) for r in p.rows[p.rows.index(hdr) + 1:] if len(r) > ti and s(r[ti]['text'])]


def rows(path):
    with open(path, encoding='utf-8') as f:
        r = list(csv.reader(f))
    return r[0], r[1:]


def main(src, out):
    books, fanfics, toread = [], [], []
    for yy in ('24', '25', '26'):
        year = 2000 + int(yy)
        p = os.path.join(src, f'books{yy}.csv')
        if os.path.exists(p):
            _, data = rows(p)
            year_books = []
            for x in data:
                x += [''] * (17 - len(x))
                if not s(x[4]):
                    continue
                mo = month(x[1])
                b = dict(year=year, month=mo, start_date=date(x[2], year, mo), end_date=date(x[3], year, mo),
                         title=s(x[4]), author=s(x[5]), rating=num(x[6]), new_author=flag(x[7]),
                         pub_year=s(x[8]), period=period(x[9], x[8]), genre=s(x[10]), source=s(x[11]).lower(), language=s(x[12]),
                         country=s(x[13]), pages=num(x[14]), format=s(x[15]), first_time=flag(x[16]), pick=None)
                year_books.append(b)
            # monthly favourite / least favourite from the stats sheet
            sp = os.path.join(src, f'stats{yy}.csv')
            if os.path.exists(sp):
                _, st = rows(sp)
                for x in st:
                    if len(x) > 10 and s(x[7]).lower() in MONTHS_FULL:
                        mo = MONTHS_FULL.index(s(x[7]).lower()) + 1
                        cand = [b for b in year_books if b['month'] == mo]
                        for col, kind in ((8, 'fav'), (10, 'worst')):
                            t = norm(x[col])
                            if not t:
                                continue
                            names = [norm(b['title']) for b in cand]
                            hit = difflib.get_close_matches(t, names, n=1, cutoff=0.6)
                            if not hit:  # "Babel" -> "Babel, or the necessity of violence"
                                hit = [n for n in names if n.startswith(t)][:1]
                            if not hit:  # "Табия 32" -> "Табия тридцать два"
                                w = re.split(r'[\s.,]', t)[0]
                                same = [n for n in names if len(w) >= 4 and re.split(r'[\s.,]', n)[0] == w]
                                hit = same if len(same) == 1 else []
                            if hit:
                                cand[names.index(hit[0])]['pick'] = kind
                            else:
                                print(f'! {year} {MONTHS_FULL[mo-1]}: не нашла книгу «{x[col]}»', file=sys.stderr)
            books += year_books
        p = os.path.join(src, f'ff{yy}.csv')
        if os.path.exists(p):
            h, data = rows(p)
            hp = os.path.join(src, f'ff{yy}.html')
            italics = italic_titles(hp) if os.path.exists(hp) else []
            year_ff = []
            for x in data:
                x += [''] * (10 - len(x))
                if not s(x[2]):
                    continue
                year_ff.append(dict(year=year, month=month(x[1]), title=s(x[2]), fandom=s(x[3]).lower(),
                                    rating=num(x[4]), language=s(x[5]), site=s(x[6]).lower(), genre=s(x[7]),
                                    notes=(x[8] or '').strip(), first_time=flag(x[9]) if len(h) > 9 else None,
                                    downloaded=False))
            if italics:
                if [t for t, _ in italics] != [f['title'] for f in year_ff]:
                    print(f'! ff{yy}: строки HTML и CSV не совпадают, отметки «скачан» пропущены', file=sys.stderr)
                else:
                    for f, (_, it) in zip(year_ff, italics):
                        f['downloaded'] = it
            fanfics += year_ff
    p = os.path.join(src, 'toread.csv')
    if os.path.exists(p):
        _, data = rows(p)
        for x in data:
            x += [''] * (6 - len(x))
            if not s(x[1]):
                continue
            dl = s(x[4]).lower()
            toread.append(dict(title=s(x[1]), author=s(x[2]), comment=s(x[3]),
                               downloaded=dl.startswith(('да', 'da', 'yes')),
                               note=s(' '.join(c for c in [dl.partition(',')[2]] + x[5:] if s(c)))))
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(dict(version=1, books=books, fanfics=fanfics, toread=toread), f, ensure_ascii=False, indent=1)
    print(f'книг: {len(books)}, фанфиков: {len(fanfics)} (скачано {sum(1 for f in fanfics if f["downloaded"])}), '
          f'to read: {len(toread)}, отмечено любимых/нелюбимых: {sum(1 for b in books if b["pick"])}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
