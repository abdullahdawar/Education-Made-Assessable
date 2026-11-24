"""Extract original Grade 1 homework pages without copying assessment pages."""

import re
import shutil
import subprocess
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject, BooleanObject, DictionaryObject, NameObject, NullObject, NumberObject, TextStringObject,
)

HOMEWORK_PAGES = 7
TEST_PAGES = 3
PASHTO_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def packet(path: Path, language: str) -> PdfReader:
    reader = PdfReader(path, strict=True)
    if reader.is_encrypted or reader.trailer["/Root"].get("/Lang") != language:
        raise ValueError(f"{path.name}: expected an unencrypted {language} packet")
    if len(reader.pages) != HOMEWORK_PAGES + TEST_PAGES:
        raise ValueError(f"{path.name}: expected seven worksheets and three tests")

    for index, page in enumerate(reader.pages, 1):
        lines = page.extract_text().translate(PASHTO_DIGITS).splitlines()
        homework = index <= HOMEWORK_PAGES
        number = index if homework else index - HOMEWORK_PAGES
        mark = ("Worksheet" if homework else "Test") if language == "en" else (
            "تمرینپاڼه" if homework else "ازموینه"
        )
        header = next((line for line in lines[:4] if mark.casefold() in line.casefold()), "")
        if not re.search(rf"(?<!\d){number}(?!\d)", header):
            raise ValueError(f"{path.name}: cannot verify heading on page {index}")
        if page.get("/Annots") or page.get("/AA"):
            raise ValueError(f"{path.name}: unexpected interactive links on page {index}")

    return reader


def preserve_page_tags(reader: PdfReader, page, writer: PdfWriter, new_page) -> None:
    """Rebuild the original page's PDF tag graph without cross-page pointers."""
    structure = reader.trailer["/Root"]["/StructTreeRoot"]
    document = structure["/K"]
    if structure.get("/RoleMap") or structure.get("/ClassMap"):
        raise ValueError("Unexpected custom PDF tag mappings")
    source_key = page["/StructParents"]
    roots = document["/K"]
    if len(roots) != len(reader.pages) or roots[source_key].get_object().raw_get("/Pg") != page.indirect_reference:
        raise ValueError("Expected one structure subtree for each source page")

    def dictionary(**items):
        return DictionaryObject({NameObject("/" + key): value for key, value in items.items()})

    def register(item):
        # pypdf exposes add_page publicly but registering raw PDF structure
        # elements requires the same low-level object API used by pypdf itself.
        return writer._add_object(item)

    tree = dictionary(Type=NameObject("/StructTreeRoot"), ParentTreeNextKey=NumberObject(1))
    tree_ref = register(tree)
    doc = dictionary(Type=NameObject("/StructElem"), S=NameObject("/Document"),
                     Lang=document["/Lang"], P=tree_ref)
    doc_ref = register(doc)
    tree[NameObject("/K")] = doc_ref
    elements = {}
    names = []

    def copy_child(child, parent):
        if isinstance(child, ArrayObject):
            return ArrayObject(copy_child(item.get_object(), parent) for item in child)
        if isinstance(child, NumberObject):
            return NumberObject(child)
        if not isinstance(child, DictionaryObject) or child.get("/Type") != "/StructElem":
            raise ValueError("Unexpected item in PDF tag graph")
        clone = dictionary(Type=NameObject("/StructElem"), P=parent)
        clone_ref = register(clone)
        elements[child.indirect_reference] = clone_ref
        for key in ("/S", "/Lang", "/Alt", "/ID", "/A"):
            if key in child:
                clone[NameObject(key)] = child[key].clone(writer)
        if "/ID" in child:
            names.append((clone["/ID"], clone_ref))
        if "/Pg" in child:
            if child.raw_get("/Pg") != page.indirect_reference:
                raise ValueError("Worksheet tag points at another page")
            clone[NameObject("/Pg")] = new_page.indirect_reference
        clone[NameObject("/K")] = copy_child(child["/K"], clone_ref)
        return clone_ref

    doc[NameObject("/K")] = ArrayObject([copy_child(roots[source_key].get_object(), doc_ref)])
    number_tree = structure["/ParentTree"]["/Nums"]
    source_entries = dict(zip(number_tree[::2], number_tree[1::2], strict=True))
    new_mapping = ArrayObject(
        NullObject() if isinstance(entry.get_object(), NullObject) else elements[entry]
        for entry in source_entries[source_key].get_object()
    )
    tree[NameObject("/ParentTree")] = register(dictionary(Nums=ArrayObject([
        NumberObject(0), register(new_mapping),
    ])))
    if names:
        tree[NameObject("/IDTree")] = register(dictionary(
            Names=ArrayObject(value for pair in sorted(names) for value in pair)
        ))
    new_page[NameObject("/StructParents")] = NumberObject(0)
    new_page[NameObject("/Tabs")] = page["/Tabs"]
    writer.root_object[NameObject("/MarkInfo")] = dictionary(Marked=BooleanObject(True))
    writer.root_object[NameObject("/StructTreeRoot")] = tree_ref


def extract_homework(reader: PdfReader, index: int, language: str, title: str, target: Path) -> None:
    if not 1 <= index <= HOMEWORK_PAGES:
        raise ValueError("Homework page index must be between 1 and 7")

    page = reader.pages[index - 1]
    writer = PdfWriter()
    # Start from a blank catalog so bookmarks, embedded attachments, and the
    # structure tree of the combined source cannot reference old test pages.
    new_page = writer.add_page(page, excluded_keys=("/StructParents", "/Tabs"))
    preserve_page_tags(reader, page, writer, new_page)
    writer.root_object[NameObject("/Lang")] = TextStringObject(language)
    writer.add_metadata({"/Title": title})
    with target.open("xb") as stream:
        writer.write(stream)

    result = PdfReader(target, strict=True)
    if (
        len(result.pages) != 1
        or result.pages[0].mediabox != page.mediabox
        or result.pages[0].get_contents().get_data() != page.get_contents().get_data()
        or result.pages[0].extract_text() != page.extract_text()
        or result.trailer["/Root"].get("/Lang") != language
        or not result.trailer["/Root"].get("/StructTreeRoot")
        or result.pages[0].get("/StructParents") != 0
    ):
        raise ValueError(f"{target.name}: output does not match its original worksheet")


def copy_notes(source: Path, target: Path, language: str) -> None:
    reader = PdfReader(source, strict=True)
    if reader.is_encrypted or reader.trailer["/Root"].get("/Lang") != language:
        raise ValueError(f"{source.name}: expected an unencrypted {language} notes PDF")
    if not reader.pages or reader.attachments:
        raise ValueError(f"{source.name}: empty teaching notes or unexpected attachments")
    with source.open("rb") as input_stream, target.open("xb") as output_stream:
        shutil.copyfileobj(input_stream, output_stream)


def rasterized_pages(path: Path, first: int, last: int) -> bytes:
    return subprocess.run(
        ["pdftoppm", "-r", "45", "-f", str(first), "-l", str(last), str(path)],
        check=True, capture_output=True,
    ).stdout


def verify_render(source: Path, worksheets: list[Path]) -> None:
    if rasterized_pages(source, 1, HOMEWORK_PAGES) != b"".join(
        rasterized_pages(worksheet, 1, 1) for worksheet in worksheets
    ):
        raise ValueError(f"{source.name}: split homework renders differ from the original pages")
