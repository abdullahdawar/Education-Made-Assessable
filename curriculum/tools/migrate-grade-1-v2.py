"""Build a local, private Version 2 import bundle from existing Grade 1 content."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

from v2_homework import HOMEWORK_PAGES, copy_notes, extract_homework, packet, verify_render

ROOT = Path(__file__).resolve().parents[2]
CURRICULUM = ROOT / "curriculum"
LANGUAGES = ("en", "ps")
TO_PASHTO = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
LOCAL_ROOT = ROOT / "output/local"  # Ignored and outside both app static roots.


def bilingual(en, ps=None):
    return {"en": en, "ps": ps if ps is not None else en}


def join(*parts):
    return {language: "\n\n".join(part[language] for part in parts if part.get(language))
            for language in LANGUAGES}


def read_json(source):
    return json.loads(source.read_text(encoding="utf-8"))


def document_rows(source):
    return [[cell.strip() for cell in line.strip().strip("|").split(" | ")]
            for line in source.splitlines() if re.match(r"^\| [0-9]", line)]


def objective(code, label):
    return {"label": label, "reference": code}


def lesson(label, body):
    return {"label": label, "body": body}


def activity_key(key, title):
    return {"id": key, "type": "specialized", "component": key, "title": title}


def configured_activity(key, kind, title, rounds):
    return {
        "id": key,
        "type": kind,
        "title": title,
        "rounds": [{"id": f"round-{index}", **value} for index, value in enumerate(rounds, 1)],
    }


def choice_round(prompt, choices, solution, hint, explanation=None):
    result = {
        "prompt": prompt,
        "choices": [{"id": f"item-{i + 1}", "label": label} for i, label in enumerate(choices)],
        "answer": [f"item-{index + 1}" for index in solution],
        "hint": hint,
    }
    if explanation:
        result["explanation"] = explanation
    return result


def draft_tests(prompts, subject, marks=1):
    if len(prompts) != 3:
        raise ValueError("Expected three authored assessment prompts")
    instructions = {
        "english": bilingual("Respond in English.", "په انګلیسي ځواب ورکړئ."),
        "mathematics": bilingual("Show your work.", "خپل کار وښيئ."),
        "science": bilingual("Explain your observations.", "خپله کتنه تشریح کړئ."),
    }
    return [
        {
            "slot": index,
            "state": "draft",
            "title": bilingual(f"Test {index}", f"ازموینه {index}"),
            "instructions": instructions[subject],
            # An unverified mark value belongs to a private draft. Never publish
            # these definitions without an educator confirming marks and mode.
            "questions": [{"id": "q1", "type": "long_answer", "prompt": text,
                           "marks": marks, "answer": {}}],
        }
        for index, text in enumerate(prompts, 1)
    ]


def digit_count_questions(prompt):
    """Convert the original three-part Counting Test 2 to objective questions."""
    parts = {language: re.split(r"(?<=\.)\s+", text.replace(chr(96), ""))
             for language, text in prompt.items()}
    if any(len(language) != 3 for language in parts.values()):
        raise ValueError("Counting Test 2 must still contain its three original prompts")
    questions = []
    for index, (en, ps) in enumerate(zip(parts["en"], parts["ps"], strict=True), 1):
        amount = en.count("●")
        # The first two questions ask how many printed dots are shown. The
        # final prompt asks how many remain after removing all marks.
        if amount != ps.count("●") or (amount == 0) != (index == 3):
            raise ValueError("Counting Test 2 diagrams differ between presentations")
        questions.append({"id": f"q{index}", "type": "short_answer", "prompt": bilingual(en, ps),
                          "marks": 1, "answer": {"number": amount}})
    return questions


def unit(subject, slug, position, title, description, objectives, lessons, activities,
         assessments, *, state="published"):
    return {
        "grade": 1, "subject": subject, "slug": slug, "position": position,
        "state": state, "label": title, "description": description,
        "objectives": objectives, "lessons": lessons, "resources": [],
        "activities": activities, "videos": [], "assessments": assessments,
    }


def counting_unit():
    path = CURRICULUM / "grade-1-mathematics-counting.md"
    overview, english, pashto, _homework, tests = re.split(r"^## ", path.read_text(), flags=re.M)
    title = bilingual("Counting collections from 0 to 20", "له ۰ څخه تر ۲۰ پورې د شیانو شمېرل")
    body = bilingual(english.split("\n", 1)[1].strip(), pashto.split("\n", 1)[1].strip())
    body = {language: text.replace("**", "") for language, text in body.items()}
    objectives = [objective(code, bilingual(summary, "")) for code, summary, _ in document_rows(overview)]
    prompts = [bilingual(en, ps) for _, en, ps in document_rows(tests)]
    assessments = draft_tests(prompts, "mathematics", marks=3)
    assessments[1]["questions"] = digit_count_questions(prompts[1])
    return unit(
        "mathematics", "counting", 1, title, title, objectives, [lesson(title, body)],
        [activity_key("counting-adventure", bilingual("Counting Adventure", "د شمېرلو سفر"))],
        assessments,
    )


def number_names_unit():
    data = read_json(CURRICULUM / "grade-1-mathematics-number-names.json")
    codes = ("1Ni.01", "1Nc.02", "1Nc.03")
    chart = {
        language: "\n".join(
            f"{str(index).translate(TO_PASHTO) if language == 'ps' else index} — {name}"
            for index, name in enumerate(data["names"][language])
        )
        for language in LANGUAGES
    }
    lessons = [
        lesson(item["title"], join(item["model"], chart if item["id"] == "names" else {}, item["check"]))
        for item in data["lessons"]
    ]
    # The original tests with diagrams need a suitable digital source asset.
    # Preserve their authored wording in private draft slots for that review.
    prompts = [join(*item["tasks"]) for item in data["practice"][HOMEWORK_PAGES:]]
    return unit(
        "mathematics", "number-names", 2, data["title"], data["title"],
        [objective(code, item["title"]) for code, item in zip(codes, data["lessons"], strict=True)],
        lessons,
        [activity_key("number-explorer", bilingual("Number Explorer", "د شمېرو پلټونکی"))],
        draft_tests(prompts, "mathematics"),
    )


def maths_unit(data):
    lessons = [
        lesson(item["title"], join(item["explain"], item["diagram"], item["example"], item["check"]))
        for item in data["lessons"]
    ]
    rounds = []
    for item in data["rounds"]:
        value = choice_round(item["prompt"], item["tiles"], item["solution"], item["hint"], item.get("explain"))
        if "grid" in item:
            value["grid"] = item["grid"]
        rounds.append(value)
    activities = [configured_activity("maths-practice", "sequencing", data["game"], rounds)]
    if data["number"] == 9:
        activities.append(activity_key("shape-sorter", bilingual("Shape Sorter", "د شکلونو بېلوونکی")))

    return unit(
        "mathematics", f'maths-{data["number"]:02}', data["number"], data["title"],
        data["lessons"][0]["explain"],
        [objective(item["code"], item["title"]) for item in data["lessons"]],
        lessons, activities,
        draft_tests([item["task"] for item in data["practice"][HOMEWORK_PAGES:]], "mathematics"),
    )


def english_unit(data, objective_register):
    title = bilingual(data["title"], data["titlePs"])
    introduction = bilingual(data["intro"], data["support"])
    stimulus = bilingual(f'{data["icon"]}\n{data["text"]}\n\n{data["model"]}\n\n{data["activity"]}')
    lesson_body = join(introduction, stimulus, bilingual(data["adult"], data["adultPs"]))
    if data.get("audioPending"):
        lesson_body = join(lesson_body, bilingual("Recorded audio is pending verification.", "ثبت شوی غږ لا د کتنې لپاره پاتې دی."))
    rounds = [
        choice_round(bilingual(item["prompt"]), list(map(bilingual, item["choices"])),
                     [item["choices"].index(value) for value in item["answer"]],
                     bilingual(item["hint"]))
        for item in data["rounds"]
    ]
    practice = configured_activity("english-practice", "word-construction", bilingual(data["game"]), rounds)
    practice["instructions"] = bilingual(
        "Read the English prompt and select the items in order.", data["rounds"][0]["instruction"]
    )
    return unit(
        "english", f'english-{data["number"]:02}', data["number"], title, introduction,
        [objective(code, bilingual(objective_register[code]["scope"], "")) for code in data["codes"]],
        [lesson(title, lesson_body)], [practice],
        draft_tests(list(map(bilingual, data["tasks"][HOMEWORK_PAGES:])), "english"),
    )


def science_unit(data):
    title = data["title"]
    plan = data["investigation"]
    inquiry = join(
        plan["question"], plan["safety"],
        bilingual("Predict what you might notice before you start.", "له کتنې مخکې خپل اټکل ووایئ یا یې ولیکئ."),
        plan["steps"], bilingual("Record what you actually observed in a drawing, label or table.",
                                 "خپله کتنه په انځور، نښه یا جدول کې ثبت کړئ."),
        bilingual("Explain what happened and compare it with your prediction.", "خپله کتنه له اټکل سره پرتله کړئ."),
        plan["alternative"],
    )
    roadmap = (ROOT / "docs/grade-1-science-curriculum-roadmap.md").read_text()
    coverage = roadmap.split("## Objective coverage", 1)[1].split("## Safety", 1)[0]
    objectives = [
        objective(code, bilingual(activity, ""))
        for code, chapter, activity, _ in document_rows(coverage)
        if str(data["number"]) in chapter.split(", ")
    ]
    rounds = [choice_round(item["prompt"], item["choices"], item["answer"], item["hint"])
              for item in data["rounds"]]
    return unit(
        "science", f'science-{data["number"]:02}', data["number"], title, data["lesson"],
        objectives, [lesson(title, data["lesson"]),
                     lesson(bilingual("Practical enquiry with an adult", "له مشر سره عملي پلټنه"), inquiry)],
        [configured_activity("science-practice", "sequencing", data["game"], rounds)],
        draft_tests([item["prompt"] for item in data["tasks"][HOMEWORK_PAGES:]], "science"),
        state="draft",
    )


def resource(key, kind, label, path, language=None):
    item = {"id": key, "kind": kind, "label": label, "path": path.as_posix()}
    if language:
        item["language"] = language
    return item


def source_pdf(stem, language, kind):
    return ROOT / f"output/pdf/{stem}-{language}-{kind}.pdf"


def extract_resources(out, item, stem, compare_renders):
    relative = Path("resources") / stem
    target = out / relative
    target.mkdir(parents=True)
    proofs = []
    for language in LANGUAGES:
        notes_source = source_pdf(stem, language, "notes")
        notes_name = f"{language}-notes.pdf"
        copy_notes(notes_source, target / notes_name, language)
        item["resources"].append(
            resource(f"{language}-notes", "notes", bilingual("Teaching notes", "د لوست یادښتونه"),
                     relative / notes_name, language)
        )
        source = source_pdf(stem, language, "worksheets-and-tests")
        reader = packet(source, language)
        worksheets = []
        for position in range(1, HOMEWORK_PAGES + 1):
            key = f"{language}-worksheet-{position}"
            name = f"{key}.pdf"
            title = bilingual(f"Worksheet {position}", f"تمرینپاڼه {position}")
            extract_homework(reader, position, language, title[language], target / name)
            item["resources"].append(resource(key, "homework", title, relative / name, language))
            worksheets.append(target / name)
        if compare_renders:
            verify_render(source, worksheets)
        proofs.append({
            "source": str(source.relative_to(ROOT)),
            "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "worksheets": [str(path.relative_to(out)) for path in worksheets],
            "notesSha256": hashlib.sha256(notes_source.read_bytes()).hexdigest(),
        })
    return proofs


def copy_illustration(out, item, source, relative_path, label):
    target = out / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    with source.open("rb") as input_stream, target.open("xb") as output_stream:
        shutil.copyfileobj(input_stream, output_stream)
    item["resources"].append(resource(relative_path.stem, "illustration", label, relative_path))


def build_bundle(out, compare_renders):
    maths_source = [read_json(CURRICULUM / f"grade-1-maths/{index}.json") for index in range(3, 14)]
    register = {item["code"]: item for item in read_json(CURRICULUM / "grade-1-english/objectives.json")}
    source_units = [
        ("grade-1-counting", counting_unit()), ("grade-1-number-names", number_names_unit()),
        *[(f'grade-1-maths-{data["number"]:02}', maths_unit(data)) for data in maths_source],
        *[(f"grade-1-english-{index:02}", english_unit(read_json(CURRICULUM / f"grade-1-english/{index}.json"), register))
          for index in range(1, 13)],
    ]
    proofs = [proof for stem, item in source_units for proof in extract_resources(out, item, stem, compare_renders)]
    units = [item for _, item in source_units]
    for data, item in zip(maths_source, units[2:13], strict=True):
        for entry in data["lessons"]:
            if visual := entry.get("visual"):
                filename = visual["file"]
                relative = Path("resources") / f'grade-1-{item["slug"]}' / filename
                copy_illustration(out, item, CURRICULUM / "grade-1-maths/figures" / filename,
                                  relative, visual["alt"])

    data = read_json(CURRICULUM / "grade-1-science/1.json")
    science = science_unit(data)
    copy_illustration(out, science, CURRICULUM / "grade-1-science/diagrams/1.svg",
                      Path("resources/grade-1-science-01/living-things.svg"), data["diagram"])
    units.append(science)

    def write_json(name, data):
        with (out / name).open("x", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")

    write_json("import.json", {"units": units})
    write_json("migration-verification.json", {"renderVerified": compare_renders, "packets": proofs})
    print(f"Prepared {len(units)} units, {len(proofs)} notes PDFs and {HOMEWORK_PAGES * len(proofs)} worksheets.")
    print(f"Private bundle: {out / 'import.json'}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="v2-grade-1", help="New folder under output/local")
    parser.add_argument("--verify-render", action="store_true", help="Compare source and split page pixels using Poppler")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", args.name):
        parser.error("--name must be a lowercase folder name")
    if args.verify_render and not shutil.which("pdftoppm"):
        parser.error("--verify-render requires pdftoppm")
    out = LOCAL_ROOT / args.name
    if not out.resolve().is_relative_to(LOCAL_ROOT.resolve()) or LOCAL_ROOT.resolve() != LOCAL_ROOT:
        parser.error("Private output root cannot be redirected through symlinks")
    try:
        out.mkdir(parents=True, exist_ok=False, mode=0o700)
        build_bundle(out, args.verify_render)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Migration did not finish: {error}\n")


if __name__ == "__main__":
    main()
