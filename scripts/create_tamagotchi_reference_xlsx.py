from __future__ import annotations

import os
import shutil
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "프론트_다마고치_화면_레퍼런스.xlsx"
CHARACTER = ROOT / "frontend" / "public" / "img" / "character.png"


def col_name(index: int) -> str:
    name = ""
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def cell_xml(row: int, col: int, value: str = "", style: int = 0) -> str:
    ref = f"{col_name(col)}{row}"
    attrs = f' r="{ref}"'
    if style:
        attrs += f' s="{style}"'
    if value == "":
        return f"<c{attrs}/>"
    return f'<c{attrs} t="inlineStr"><is><t>{escape(value)}</t></is></c>'


def row_xml(row: int, cells: list[tuple[int, str, int]], height: int | None = None) -> str:
    attrs = f' r="{row}"'
    if height:
        attrs += f' ht="{height}" customHeight="1"'
    body = "".join(cell_xml(row, col, value, style) for col, value, style in cells)
    return f"<row{attrs}>{body}</row>"


def sheet_xml(
    rows: list[str],
    merges: list[str],
    drawing: bool = False,
    widths: dict[int, float] | None = None,
) -> str:
    widths = widths or {}
    cols = "".join(
        f'<col min="{idx}" max="{idx}" width="{width}" customWidth="1"/>'
        for idx, width in sorted(widths.items())
    )
    merge_xml = ""
    if merges:
        merge_xml = f'<mergeCells count="{len(merges)}">' + "".join(
            f'<mergeCell ref="{m}"/>' for m in merges
        ) + "</mergeCells>"
    drawing_xml = '<drawing r:id="rId1"/>' if drawing else ""
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>{cols}</cols>
<sheetData>{''.join(rows)}</sheetData>
{merge_xml}
{drawing_xml}
</worksheet>'''


def make_sheet1() -> str:
    widths = {1: 4, 2: 15, 3: 15, 4: 15, 5: 15, 6: 15, 7: 15, 8: 15, 9: 15}
    rows = [
        row_xml(1, [(2, "레벨표시", 2), (3, "나의 야구 다마고치", 1), (8, "뒤로가기", 3)], 26),
        row_xml(2, [(2, "Lv.3", 4), (3, "레벨 게이지", 5), (8, "담당: 용준", 6)], 24),
        row_xml(3, [(2, "캐릭터 영역", 7)], 20),
        row_xml(4, [(2, "", 8)], 30),
        row_xml(5, [(2, "", 8)], 30),
        row_xml(6, [(2, "", 8)], 30),
        row_xml(7, [(2, "", 8)], 30),
        row_xml(8, [(2, "", 8)], 30),
        row_xml(9, [(2, "", 8)], 30),
        row_xml(10, [(2, "", 8)], 30),
        row_xml(11, [(2, "", 8)], 30),
        row_xml(12, [(2, "", 8)], 30),
        row_xml(13, [(2, "", 8)], 20),
        row_xml(14, [(2, "안녕 오늘도 왔구나!", 9)], 30),
        row_xml(15, [(2, "상태 영역", 7)], 22),
        row_xml(16, [(2, "응원력", 10), (4, "███████░░░ 70", 11), (7, "컨디션", 10), (8, "████████░░ 80", 11)], 24),
        row_xml(17, [(2, "친밀도", 10), (4, "██████░░░░ 60", 11), (7, "경험치", 10), (8, "█████░░░░░ 50", 11)], 24),
        row_xml(18, [(2, "행동 버튼", 7)], 22),
        row_xml(19, [(2, "출석체크", 12), (4, "밥 주기", 12), (6, "응원하기", 12), (8, "놀아주기", 12)], 34),
        row_xml(20, [(2, "퀴즈풀기", 12), (4, "꾸미기", 12), (6, "경기 보기", 12), (8, "알림 확인", 12)], 34),
        row_xml(21, [(2, "최근 기록 / 알림", 7)], 22),
        row_xml(22, [(2, "- 오늘 출석 완료", 13), (6, "- 퀴즈 정답: 친밀도 +5", 13)], 24),
        row_xml(23, [(2, "- 응원하기 완료: 응원력 +3", 13), (6, "- 컨디션 낮을 때 밥 주기 추천", 13)], 24),
        row_xml(24, [(2, "화면 이동 기준", 7)], 22),
        row_xml(25, [(2, "출석체크 버튼 -> 출석체크 기능 / 퀴즈풀기 버튼 -> 퀴즈 화면 / 꾸미기 버튼 -> 아이템 또는 스킨 설정", 14)], 36),
    ]
    merges = [
        "C1:G1", "H1:H2", "B3:H13", "B14:H14", "B15:H15",
        "B16:C16", "D16:F16", "G16:G16", "H16:H16",
        "B17:C17", "D17:F17", "G17:G17", "H17:H17",
        "B18:H18", "B19:C19", "D19:E19", "F19:G19", "H19:I19",
        "B20:C20", "D20:E20", "F20:G20", "H20:I20",
        "B21:H21", "B22:E22", "F22:I22", "B23:E23", "F23:I23",
        "B24:H24", "B25:I25",
    ]
    return sheet_xml(rows, merges, drawing=True, widths=widths)


def make_sheet2() -> str:
    widths = {1: 4, 2: 24, 3: 68, 4: 18}
    rows = [
        row_xml(1, [(2, "다마고치 프론트엔드 레퍼런스", 1)], 28),
        row_xml(3, [(2, "구분", 2), (3, "내용", 2), (4, "담당", 2)], 24),
        row_xml(4, [(2, "화면 목적", 10), (3, "캐릭터와 상호작용하면서 출석체크, 퀴즈, 응원 활동으로 연결되는 중심 화면", 13), (4, "용준", 13)], 34),
        row_xml(5, [(2, "핵심 구조", 10), (3, "상단바 -> 캐릭터 영역 -> 말풍선 -> 상태 영역 -> 행동 버튼 -> 최근 기록", 13), (4, "용준", 13)], 34),
        row_xml(6, [(2, "캐릭터 상태", 10), (3, "레벨, 응원력, 친밀도, 컨디션, 경험치를 게이지로 표시", 13), (4, "용준", 13)], 34),
        row_xml(7, [(2, "행동 버튼", 10), (3, "출석체크, 밥 주기, 응원하기, 놀아주기, 퀴즈풀기, 꾸미기, 경기 보기, 알림 확인", 13), (4, "용준", 13)], 34),
        row_xml(8, [(2, "상태 변화", 10), (3, "출석 완료 시 경험치 증가, 퀴즈 정답 시 친밀도 증가, 응원하기 시 응원력 증가", 13), (4, "용준", 13)], 34),
        row_xml(9, [(2, "말풍선", 10), (3, "상태나 시간대에 따라 짧은 멘트 표시. 예: 안녕 오늘도 왔구나!", 13), (4, "용준", 13)], 34),
        row_xml(10, [(2, "디자인 기준", 10), (3, "캐릭터를 가장 크게 배치하고 버튼은 2줄 그리드로 정렬. 정보는 한눈에 보이게 짧게 표시", 13), (4, "용준", 13)], 34),
        row_xml(11, [(2, "API 연결", 10), (3, "출석체크: /attendance, 퀴즈: /quiz, 알림: 프론트 토글/푸시 기능과 연결", 13), (4, "용준", 13)], 34),
        row_xml(13, [(2, "개발 메모", 7)], 24),
        row_xml(14, [(2, "캐릭터 이미지는 frontend/public/img/character.png 사용. 상태에 따라 추후 이미지/애니메이션 교체 가능.", 14)], 36),
        row_xml(15, [(2, "프론트 실행: cd frontend 후 npm run dev, 접속 주소: http://127.0.0.1:5000", 14)], 28),
    ]
    merges = ["B1:D1", "B13:D13", "B14:D14", "B15:D15"]
    return sheet_xml(rows, merges, widths=widths)


def write_file(zf: zipfile.ZipFile, name: str, content: str | bytes) -> None:
    zf.writestr(name, content)


def main() -> None:
    if not CHARACTER.exists():
        raise FileNotFoundError(f"character image not found: {CHARACTER}")

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        write_file(zf, "[Content_Types].xml", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
</Types>''')
        write_file(zf, "_rels/.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>''')
        write_file(zf, "xl/workbook.xml", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="다마고치 화면" sheetId="1" r:id="rId1"/>
<sheet name="개발 참고사항" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>''')
        write_file(zf, "xl/_rels/workbook.xml.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>''')
        write_file(zf, "xl/styles.xml", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="14"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font><font><sz val="10"/><name val="맑은 고딕"/></font></fonts>
<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4E6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE0B2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/></patternFill></fill></fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border><border><left style="medium"/><right style="medium"/><top style="medium"/><bottom style="medium"/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>''')
        write_file(zf, "xl/worksheets/sheet1.xml", make_sheet1())
        write_file(zf, "xl/worksheets/sheet2.xml", make_sheet2())
        write_file(zf, "xl/worksheets/_rels/sheet1.xml.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>''')
        write_file(zf, "xl/drawings/drawing1.xml", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<xdr:oneCellAnchor>
<xdr:from><xdr:col>3</xdr:col><xdr:colOff>600000</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>120000</xdr:rowOff></xdr:from>
<xdr:ext cx="3000000" cy="3000000"/>
<xdr:pic>
<xdr:nvPicPr><xdr:cNvPr id="2" name="character.png"/><xdr:cNvPicPr/></xdr:nvPicPr>
<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
</xdr:pic>
<xdr:clientData/>
</xdr:oneCellAnchor>
</xdr:wsDr>''')
        write_file(zf, "xl/drawings/_rels/drawing1.xml.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/character.png"/>
</Relationships>''')
        zf.write(CHARACTER, "xl/media/character.png")

    print(OUT)


if __name__ == "__main__":
    main()
