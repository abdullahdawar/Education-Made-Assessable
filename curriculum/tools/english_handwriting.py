"""Draft upright manuscript formation. Coordinates share a 48-unit baseline."""

# Each path starts with M x y. Separate paths indicate a pen lift.
LETTERS = {
    "A": ["M 7 48 L 23 6 L 39 48", "M 13 34 H 33"],
    "B": ["M 9 48 V 6 H 23 Q 42 6 34 20 Q 31 26 24 26 H 9",
          "M 24 26 Q 43 26 37 41 Q 34 48 24 48 H 9"],
    "C": ["M 38 12 C 29 0 8 5 8 26 C 8 45 25 55 38 42"],
    "D": ["M 9 48 V 6 H 21 C 47 6 47 48 21 48 H 9"],
    "E": ["M 36 6 H 10 V 48 H 36", "M 10 26 H 31"],
    "F": ["M 10 48 V 6 H 36", "M 10 26 H 31"],
    "G": ["M 38 12 C 29 0 8 5 8 26 C 8 48 28 55 38 41 V 28 H 26"],
    "H": ["M 9 6 V 48", "M 37 6 V 48", "M 9 27 H 37"],
    "I": ["M 23 6 V 48", "M 12 6 H 34", "M 12 48 H 34"],
    "J": ["M 34 6 V 37 Q 34 54 17 47 Q 10 44 9 38", "M 21 6 H 42"],
    "K": ["M 9 6 V 48", "M 38 6 L 9 31", "M 17 24 L 39 48"],
    "L": ["M 10 6 V 48 H 37"],
    "M": ["M 7 48 V 6 L 23 31 L 39 6 V 48"],
    "N": ["M 9 48 V 6 L 37 48 V 6"],
    "O": ["M 25 6 C 2 6 2 48 23 48 C 45 48 45 9 28 6"],
    "P": ["M 10 48 V 6 H 24 C 44 6 44 29 24 29 H 11"],
    "Q": ["M 25 6 C 2 6 2 48 23 48 C 45 48 45 9 28 6", "M 27 37 L 42 51"],
    "R": ["M 10 48 V 6 H 24 C 44 6 44 28 24 28 H 11", "M 23 28 L 38 48"],
    "S": ["M 37 11 C 26 0 8 7 10 18 C 11 28 37 24 37 38 C 37 50 18 52 8 42"],
    "T": ["M 5 6 H 41", "M 23 6 V 48"],
    "U": ["M 8 6 V 33 C 8 53 38 53 38 33 V 6"],
    "V": ["M 6 6 L 23 48 L 40 6"],
    "W": ["M 4 6 L 13 48 L 23 21 L 33 48 L 42 6"],
    "X": ["M 7 6 L 39 48", "M 39 6 L 7 48"],
    "Y": ["M 6 6 L 23 27 L 40 6", "M 23 27 V 48"],
    "Z": ["M 7 6 H 39 L 7 48 H 39"],
    "a": ["M 33 25 C 20 13 10 25 10 36 C 10 52 26 52 34 41", "M 34 21 V 48"],
    "b": ["M 11 6 V 48", "M 11 29 C 21 13 37 22 37 35 C 37 49 22 53 12 43"],
    "c": ["M 34 25 C 24 16 11 21 11 35 C 11 47 23 53 34 44"],
    "d": ["M 34 25 C 20 14 10 24 10 36 C 10 52 26 52 34 41", "M 34 6 V 48"],
    "e": ["M 11 34 H 35 C 35 16 11 17 11 35 C 11 47 24 53 35 44"],
    "f": ["M 33 9 C 20 2 15 9 15 21 V 48", "M 8 23 H 29"],
    "g": ["M 34 25 C 20 14 10 24 10 36 C 10 52 26 52 34 41",
          "M 34 21 V 53 Q 34 69 13 59"],
    "h": ["M 11 6 V 48", "M 11 32 Q 35 10 35 33 V 48"],
    "i": ["M 23 21 V 48", "M 23 12 v 0.7"],
    "j": ["M 27 21 V 53 Q 27 65 15 60", "M 27 12 v 0.7"],
    "k": ["M 11 6 V 48", "M 35 21 L 11 38", "M 20 32 L 36 48"],
    "l": ["M 22 6 V 48"],
    "m": ["M 7 21 V 48", "M 7 31 Q 23 12 23 31 V 48", "M 23 31 Q 39 12 39 31 V 48"],
    "n": ["M 11 21 V 48", "M 11 32 Q 35 10 35 33 V 48"],
    "o": ["M 25 21 C 6 21 6 48 23 48 C 40 48 40 23 28 21"],
    "p": ["M 11 21 V 61", "M 11 29 C 21 13 37 22 37 35 C 37 49 22 53 12 43"],
    "q": ["M 34 25 C 20 14 10 24 10 36 C 10 52 26 52 34 41", "M 34 21 V 61"],
    "r": ["M 15 21 V 48", "M 15 33 Q 22 19 32 22"],
    "s": ["M 34 24 C 25 17 13 21 13 28 C 13 36 35 32 35 41 Q 35 52 12 45"],
    "t": ["M 18 12 V 41 Q 18 53 31 46", "M 10 23 H 30"],
    "u": ["M 11 21 V 37 Q 11 57 34 41", "M 34 21 V 48"],
    "v": ["M 9 21 L 23 48 L 37 21"],
    "w": ["M 5 21 L 13 48 L 23 27 L 33 48 L 41 21"],
    "x": ["M 10 21 L 36 48", "M 36 21 L 10 48"],
    "y": ["M 9 21 L 23 43", "M 37 21 L 14 61"],
    "z": ["M 11 21 H 35 L 11 48 H 35"],
}


def diagram(letter):
    identifier = f"arrow-{ord(letter)}"
    guides = "".join(f'<path d="M 1 {y} H 47"/>' for y in (6, 21, 48, 61))
    strokes = []
    for index, path in enumerate(LETTERS[letter], 1):
        _, x, y, *_ = path.split()
        arrow = "" if "v 0.7" in path else f' marker-end="url(#{identifier})"'
        strokes.append(f'<path d="{path}"{arrow}/><circle cx="{x}" cy="{y}" r="4"/>'
                       f'<text x="{x}" y="{float(y) + 1.7}">{index}</text>')
    return (f'<svg viewBox="-5 -4 56 72" aria-hidden="true"><defs><marker id="{identifier}" '
            'markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto">'
            '<path d="M 0 0 L 3 1.5 L 0 3 Z" fill="#244174"/></marker></defs>'
            f'<g class="writing-guides">{guides}</g><g class="writing-strokes">{"".join(strokes)}</g></svg>')
