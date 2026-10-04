#!/usr/bin/env python3
"""
Regenerates apps/api/src/data/categories.json from the Agribalyse 3.2
"Synthese" dataset, with Poore & Nemecek (2018) published figures as a
backup for the handful of legacy categories Agribalyse doesn't match well.

One-time / rerunnable data-prep script, not part of the running app.
Uses only the Python standard library (an .xlsx is a zip of XML, parsed
directly) so no xlsx-parsing dependency is added to the Node project.

Usage:
    python3 apps/api/scripts/build_categories.py
"""

import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX_PATH = ROOT / "src" / "data" / "AGRIBALYSE3.2_Tableur produits alimentaires_PublieAOUT25.xlsx"
OUT_PATH = ROOT / "src" / "data" / "categories.json"

GROUP_ORDER = ["Meat & fish", "Dairy & eggs", "Produce", "Grains & bakery", "Snacks & drinks"]

# ---------------------------------------------------------------------------
# 1. Parse the Agribalyse "Synthese" sheet (sheet3.xml), rows 4-2461.
# ---------------------------------------------------------------------------


def load_shared_strings(z: zipfile.ZipFile) -> list[str]:
    xml = z.read("xl/sharedStrings.xml").decode("utf-8")
    blocks = re.findall(r"<si>(.*?)</si>", xml, re.S)
    out = []
    for b in blocks:
        texts = re.findall(r"<t[^>]*>(.*?)</t>", b, re.S)
        out.append("".join(texts))
    return out


def parse_row(content: str, shared: list[str]) -> dict[str, str]:
    cells = re.findall(r'<c r="([A-Z]+)(\d+)"([^>]*)>(.*?)</c>', content, re.S)
    out: dict[str, str] = {}
    for col, _row, attrs, inner in cells:
        t_match = re.search(r't="(\w+)"', attrs)
        ctype = t_match.group(1) if t_match else None
        v_match = re.search(r"<v>(.*?)</v>", inner, re.S)
        val = v_match.group(1) if v_match else None
        if ctype == "s" and val is not None:
            val = shared[int(val)]
        out[col] = val
    return out


def load_agribalyse_records() -> list[dict]:
    z = zipfile.ZipFile(XLSX_PATH)
    shared = load_shared_strings(z)
    data = z.read("xl/worksheets/sheet3.xml").decode("utf-8")
    rows = re.findall(r'<row r="(\d+)"[^>]*>(.*?)</row>', data, re.S)

    records = []
    for r_num, content in rows:
        n = int(r_num)
        if not (4 <= n <= 2461):
            continue
        p = parse_row(content, shared)
        name_en = p.get("F")
        co2 = p.get("N")
        if not name_en or co2 in (None, ""):
            continue
        records.append(
            {
                "group": p.get("C"),
                "subgroup": p.get("D"),
                "name_fr": p.get("E"),
                "name_en": name_en,
                "co2_per_kg": float(co2),
                "dqr": float(p["L"]) if p.get("L") not in (None, "") else 3.0,
            }
        )
    return records


# ---------------------------------------------------------------------------
# 2. Exclusions + collapsing English names at the 2nd comma.
# ---------------------------------------------------------------------------

EXCLUDED_GROUPS = {"aliments infantiles", "entrées et plats composés"}
# "œufs" is excluded too: Agribalyse's own "Notice" sheet carries a flagged
# data-quality warning that its egg impact factors (and so any dedicated egg
# product) are known to be underestimated pending a correction, so new egg
# categories aren't generated from it — the existing "eggs" category is kept
# as-is rather than refined from a source that documents its own egg figures
# as unreliable.
EXCLUDED_SUBGROUPS = {"algues", "denrées destinées à une alimentation particulière", "œufs"}


def collapse_name(name: str) -> str:
    parts = name.split(",")
    if len(parts) <= 2:
        return name.strip()
    return ",".join(parts[:2]).strip()


def collapse_records(records: list[dict]) -> dict[tuple[str, str], list[dict]]:
    """Returns {(group, subgroup): [ {name, co2_per_kg, dqr}, ... ]} with
    same-named (post-collapse) rows merged (co2 averaged, best dqr kept)."""
    buckets: dict[tuple[str, str], dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for r in records:
        if r["group"] in EXCLUDED_GROUPS or r["subgroup"] in EXCLUDED_SUBGROUPS:
            continue
        key = (r["group"], r["subgroup"])
        buckets[key][collapse_name(r["name_en"])].append(r)

    collapsed: dict[tuple[str, str], list[dict]] = {}
    for key, by_name in buckets.items():
        products = []
        for name, variants in by_name.items():
            avg_co2 = sum(v["co2_per_kg"] for v in variants) / len(variants)
            best_dqr = min(v["dqr"] for v in variants)
            products.append({"name": name, "co2_per_kg": round(avg_co2, 3), "dqr": best_dqr})
        collapsed[key] = products
    return collapsed


# ---------------------------------------------------------------------------
# 3. Map Agribalyse (group, subgroup) -> the app's 5 CategoryGroup values.
# ---------------------------------------------------------------------------


def map_group(group: str, subgroup: str) -> str:
    if group == "viandes, œufs, poissons":
        return "Dairy & eggs" if subgroup == "œufs" else "Meat & fish"
    if group == "lait et produits laitiers":
        return "Dairy & eggs"
    if group == "matières grasses":
        return "Dairy & eggs" if subgroup == "beurres" else "Snacks & drinks"
    if group == "glaces et sorbets":
        return "Dairy & eggs" if subgroup in ("glaces", "desserts glacés") else "Snacks & drinks"
    if group == "fruits, légumes, légumineuses et oléagineux":
        return "Produce"
    if group == "produits céréaliers":
        return "Grains & bakery"
    if group in ("boissons", "produits sucrés", "aides culinaires et ingrédients divers"):
        return "Snacks & drinks"
    raise ValueError(f"Unmapped group: {group!r}")


# ---------------------------------------------------------------------------
# 4. Per-subgroup selection: pick ~10% of each bucket's distinct products
#    (min 2, max 14). A pure "best data quality" ranking tends to surface
#    obscure items (e.g. an exotic Mediterranean fish, or "Hollandaise
#    sauce, prepacked") over everyday staples, so recognizable grocery
#    items are prioritized first via a keyword allowlist per subgroup, with
#    any remaining slots filled by the shortest-name/best-DQR fallback.
# ---------------------------------------------------------------------------

SELECT_RATIO = 0.10
SELECT_MIN = 2
SELECT_MAX = 14

# Subgroup -> list of case-insensitive substrings that, if present in a
# collapsed product's name, bump it to the front of the selection queue.
PRIORITY_KEYWORDS: dict[str, list[str]] = {
    "viandes crues": [
        "beef", "ground beef", "steak", "veal", "pork", "bacon", "ham",
        "sausage", "lamb", "chicken, whole", "chicken breast", "chicken thigh",
        "chicken leg", "chicken drumstick", "turkey", "duck", "mince",
    ],
    "viandes cuites": [
        "beef", "steak", "veal", "pork", "ham", "sausage", "lamb",
        "chicken breast", "chicken thigh", "chicken leg", "turkey", "duck", "roast",
    ],
    "charcuteries": ["ham", "bacon", "salami", "chorizo", "pâté", "sausage"],
    "autres produits à base de viande": ["minced", "burger", "meatball"],
    "substituts de viande": ["tofu", "seitan", "tempeh", "veggie burger", "plant-based"],
    "substituts de charcuterie": ["plant-based", "vegetarian"],
    "poissons crus": ["salmon", "tuna", "cod", "trout", "sardine", "mackerel", "anchovy", "sole", "tilapia", "haddock"],
    "poissons cuits": ["salmon", "tuna", "cod", "trout", "sardine", "mackerel", "haddock"],
    "produits à base de poissons et produits de la mer": ["fish fingers", "fish cake", "smoked salmon", "surimi"],
    "mollusques et crustacés crus": ["shrimp", "prawn", "mussel", "scallop", "oyster", "crab", "lobster", "squid"],
    "mollusques et crustacés cuits": ["shrimp", "prawn", "mussel", "scallop", "crab", "lobster"],
    "œufs": ["egg, whole", "egg white", "egg yolk", "hard-boiled"],
    "fromages": [
        "cheddar", "mozzarella", "parmesan", "feta", "brie", "camembert",
        "cream cheese", "cottage cheese", "goat cheese", "swiss", "blue cheese", "gouda",
    ],
    "produits laitiers frais et assimilés": ["yogurt", "yoghurt", "greek yogurt", "fromage blanc", "quark", "skyr"],
    "laits": ["whole milk", "skim milk", "semi-skimmed milk", "goat milk", "soy milk", "almond milk", "coconut milk"],
    "crèmes et spécialités à base de crème": ["heavy cream", "whipping cream", "sour cream", "single cream", "double cream"],
    "légumes": [
        "carrot", "onion", "garlic", "broccoli", "spinach", "lettuce", "cabbage",
        "cucumber", "courgette", "zucchini", "bell pepper", "pepper, sweet",
        "mushroom", "pea", "green bean", "cauliflower", "eggplant", "aubergine",
        "celery", "leek", "pumpkin", "squash", "sweetcorn",
    ],
    "fruits": [
        "apple", "orange", "lemon", "lime", "grape", "strawberry", "raspberry",
        "blueberry", "peach", "pear", "pineapple", "mango", "melon", "watermelon",
        "kiwi", "plum", "cherry", "apricot", "fig",
    ],
    "fruits à coque et graines oléagineuses": [
        "almond", "walnut", "cashew", "peanut", "hazelnut", "pistachio",
        "pecan", "sunflower seed", "pumpkin seed", "chia", "flaxseed",
    ],
    "pommes de terre et autres tubercules": ["potato", "sweet potato", "yam", "cassava"],
    "légumineuses": ["lentil", "chickpea", "black bean", "kidney bean", "soybean", "tofu", "white bean", "split pea", "edamame"],
    "céréales de petit-déjeuner et biscuits": ["cornflakes", "muesli", "granola", "oat flake", "biscuit", "cookie"],
    "gâteaux et pâtisseries": ["cake", "brownie", "muffin", "tart", "pastry"],
    "pains et viennoiseries": ["white bread", "whole wheat bread", "wholemeal bread", "baguette", "sourdough", "rye bread", "croissant", "bun", "roll"],
    "pâtes, riz et céréales": ["spaghetti", "macaroni", "rice, white", "rice, brown", "quinoa", "couscous", "noodle", "penne"],
    "farines et pâtes à tarte": ["wheat flour", "flour", "pie dough"],
    "boissons sans alcool": ["orange juice", "apple juice", "cola", "soda", "lemonade", "sparkling water", "coffee", "tea", "hot chocolate"],
    "boisson alcoolisées": ["beer", "wine, red", "wine, white", "cider", "champagne"],
    "chocolats et produits à base de chocolat": ["dark chocolate", "milk chocolate", "chocolate bar", "cocoa powder"],
    "confiseries non chocolatées": ["candy", "gum", "marshmallow", "licorice"],
    "sauces": ["ketchup", "mayonnaise", "mustard", "soy sauce", "bbq sauce", "vinaigrette", "pesto", "tomato sauce", "gravy"],
    "condiments": ["pickle", "olive", "caper"],
    "huiles et graisses végétales": ["olive oil", "sunflower oil", "rapeseed oil", "vegetable oil", "coconut oil"],
    "margarines": ["margarine"],
    "beurres": ["butter"],
    "herbes": ["basil", "parsley", "thyme", "oregano", "mint", "rosemary", "cilantro", "coriander"],
    "épices": ["cinnamon", "pepper, black", "paprika", "cumin", "ginger", "nutmeg", "vanilla"],
}


def select_products(key: tuple[str, str], products: list[dict]) -> list[dict]:
    _group, subgroup = key
    m = len(products)
    k = max(SELECT_MIN, min(SELECT_MAX, round(m * SELECT_RATIO)))
    k = min(k, m)

    keywords = [kw.lower() for kw in PRIORITY_KEYWORDS.get(subgroup, [])]

    def is_priority(p: dict) -> bool:
        name_lower = p["name"].lower()
        return any(kw in name_lower for kw in keywords)

    priority = [p for p in products if is_priority(p)]
    rest = [p for p in products if not is_priority(p)]

    # Within each tier, prefer shorter (more generic) names, then better DQR.
    priority.sort(key=lambda p: (len(p["name"]), p["dqr"]))
    rest.sort(key=lambda p: (len(p["name"]), p["dqr"]))

    selected = (priority + rest)[:k]
    return selected


# ---------------------------------------------------------------------------
# 5. Refine the 41 existing categories' kgCo2ePerKg from Agribalyse, with a
#    Poore & Nemecek (2018, Science) published figure or the existing value
#    kept as a backup wherever Agribalyse has no good direct match. Ids,
#    names, groups, nutrition and typicalMassKg of these 41 are untouched —
#    several of their exact ids are depended on by seed.ts/cannedReceipt.ts.
# ---------------------------------------------------------------------------

LEGACY_PATH = Path(__file__).parent / "legacy_categories.json"

# id -> exact (subgroup, collapsed product name) pairs to average, found by
# searching the full (uncurated) candidate pool for each legacy category.
# The subgroup is required, not just the name: several raw ("crues") and
# cooked ("cuites") Agribalyse entries collapse to the identical name (e.g.
# "Beef, minced steak" exists in both viandes crues at 35.70 and viandes
# cuites at 45.20) — matching by name alone would silently pick whichever
# one a dict happened to keep. Every match below is the *raw* product,
# matching how the existing categories are framed (raw grocery weight).
LEGACY_AGRIBALYSE_MATCH: dict[str, list[tuple[str, str]]] = {
    "beef": [("viandes crues", "Beef, minced steak")],
    "lamb": [
        ("viandes crues", "Lamb, leg"), ("viandes crues", "Lamb, neck"),
        ("viandes crues", "Lamb, cutlet"), ("viandes crues", "Lamb, saddle"),
    ],
    "pork": [
        ("viandes crues", "Pork, loin"), ("viandes crues", "Pork, chop"),
        ("viandes crues", "Pork, rack"), ("viandes crues", "Pork, shoulder"),
        ("viandes crues", "Pork, belly"), ("viandes crues", "Pork, roast"),
        ("viandes crues", "Pork, spare-ribs"),
    ],
    "chicken": [("viandes crues", "Chicken, breast")],
    "turkey": [
        ("viandes crues", "Turkey, meat"), ("viandes crues", "Turkey, leg"),
        ("viandes crues", "Turkey, wing"), ("viandes crues", "Turkey, escalope"),
    ],
    "farmed_shrimp": [
        ("mollusques et crustacés crus", "Shrimp, frozen"),
        ("mollusques et crustacés crus", "Shrimp or prawn, raw"),
        ("mollusques et crustacés crus", "deep water pink shrimp, raw"),
    ],
    "salmon": [("poissons crus", "Salmon, raw")],
    "canned_tuna": [("produits à base de poissons et produits de la mer", "Yellowfin tuna, canned in brine")],
    "milk": [("laits", "Milk, whole")],
    "yogurt": [
        ("produits laitiers frais et assimilés", "Yogurt, Greek-style"),
        ("produits laitiers frais et assimilés", "Yogurt, goat's milk"),
        ("produits laitiers frais et assimilés", "Dairy drink or fermented milk or yogurt, plain"),
        ("produits laitiers frais et assimilés", "Fermented milk or dairy specialty, yogurt type"),
    ],
    "butter": [
        ("beurres", "Butter, light"), ("beurres", "Butter, 80% fat"),
        ("beurres", "Butter, 82% fat"), ("beurres", "Butter, 60-62% fat"),
    ],
    # "eggs" intentionally omitted: see the œufs exclusion note above.
    "cream": [
        ("crèmes et spécialités à base de crème", "cream, light"),
        ("crèmes et spécialités à base de crème", "Thick cream, light"),
        ("crèmes et spécialités à base de crème", "Liquid cream, light"),
    ],
    "ice_cream": [
        ("glaces", "Ice cream, cone"), ("glaces", "Ice cream, in box"),
        ("glaces", "Ice cream, luxury"), ("glaces", "Ice cream, chocolate coated"),
        ("glaces", "Ice cream, in individual cup"),
    ],
    "oat_milk": [("boissons sans alcool", "Oat-based drink, plain")],
    "tomatoes": [("légumes", "Tomato, raw")],
    "potatoes": [("pommes de terre et autres tubercules", "Potato, peeled")],
    "bananas": [("fruits", "Banana, pulp")],
    "apples": [("fruits", "Apples, raw")],
    "leafy_greens": [
        ("légumes", "Spinach, raw"), ("légumes", "Lettuce, raw"), ("légumes", "Curly kale, raw"),
        ("légumes", "Swiss chard, raw"), ("légumes", "Green cabbage, raw"),
    ],
    "root_vegetables": [("légumes", "Carrot, raw"), ("légumes", "Onion, raw"), ("légumes", "Leek, raw")],
    "citrus": [("fruits", "Orange, pulp"), ("fruits", "Lemon, pulp"), ("fruits", "Grapefruit, pulp")],
    "berries": [("fruits", "Strawberry, raw"), ("fruits", "Raspberry, raw"), ("fruits", "Blueberry, raw")],
    "avocado": [("légumes", "Avocado, pulp")],
    "bread": [
        ("pains et viennoiseries", "Bread, home-made"), ("pains et viennoiseries", "Bread, French bread"),
        ("pains et viennoiseries", "Rye bread, and wheat"),
    ],
    "rice": [("pâtes, riz et céréales", "Rice, raw")],
    "pasta": [("pâtes, riz et céréales", "Dried pasta, raw")],
    "oats": [("pâtes, riz et céréales", "Oat, raw")],
    "cereal": [
        ("céréales de petit-déjeuner et biscuits", "Breakfast cereals, corn flakes"),
        ("céréales de petit-déjeuner et biscuits", "Muesli, crunchy"),
        ("céréales de petit-déjeuner et biscuits", "Muesli, flakes (Bircher-style)"),
    ],
    "tortillas": [("pains et viennoiseries", "Wheat tortilla wrap, to be filled")],
    "bagels": [("pains et viennoiseries", "Bagel")],
    "crackers": [("céréales de petit-déjeuner et biscuits", "Salty snacks, crackers")],
    "chocolate": [
        ("chocolats et produits à base de chocolat", "Dark chocolate bar, more than 40% cocoa"),
        ("chocolats et produits à base de chocolat", "Dark chocolate bar, more than 70% cocoa"),
        ("chocolats et produits à base de chocolat", "Dark chocolate bar, less than 70% cocoa"),
        ("chocolats et produits à base de chocolat", "Dark chocolate bar, filled with praline"),
        ("chocolats et produits à base de chocolat", "Dark chocolate, filled with mint confectionery"),
    ],
    "chips": [("pommes de terre et autres tubercules", "Potato crisps")],
    "coffee": [("boissons sans alcool", "Coffee, ground")],
    # "tea" intentionally omitted: Agribalyse only has brewed/liquid tea
    # entries (~0.04 kgCO2e/kg of mostly-water brew), no dry-leaf product to
    # match the existing category's dry-tea framing — existing value kept.
    "soda": [("boissons sans alcool", "Cola, with sugar")],
    "beer": [
        ("boisson alcoolisées", "Beer, regular (4-5° alcohol)"),
        ("boisson alcoolisées", "Beer, special (5-6° alcohol)"),
        ("boisson alcoolisées", "Beer, dark"),
    ],
    "wine": [("boisson alcoolisées", "Wine, red"), ("boisson alcoolisées", "Wine, rose"), ("boisson alcoolisées", "Wine, white")],
    "juice": [
        ("boissons sans alcool", "Orange juice, home-made"),
        ("boissons sans alcool", "Orange juice, reconstituted from a concentrate"),
    ],
}

# "cheese" refines from the *entire* fromages subgroup average (107 distinct
# cheeses) rather than a hand-picked list, since no single Agribalyse entry
# is a better stand-in for a generic "Cheese" category than the group mean.
CHEESE_SUBGROUP_KEY = ("lait et produits laitiers", "fromages")


def refine_legacy_categories(
    legacy: list[dict], by_subgroup_name: dict[tuple[str, str], float], cheese_avg: float
) -> None:
    for cat in legacy:
        if cat["id"] == "cheese":
            cat["kgCo2ePerKg"] = round(cheese_avg, 2)
            continue
        matches = LEGACY_AGRIBALYSE_MATCH.get(cat["id"])
        if not matches:
            continue  # eggs, tea: keep the existing estimate (documented above)
        values = [by_subgroup_name[m] for m in matches]
        cat["kgCo2ePerKg"] = round(sum(values) / len(values), 2)


# ---------------------------------------------------------------------------
# 6. Nutrition + typicalMassKg for new categories: inherit from the closest
#    existing (legacy) category, with keyword overrides per subgroup; a
#    handful of simple, well-established single-ingredient foods (water,
#    sugar/honey, cooking oils) get accurate values directly instead, since
#    that's strictly more correct than borrowing from an unrelated donor.
# ---------------------------------------------------------------------------

DONOR_DEFAULT: dict[str, str] = {
    "viandes crues": "chicken", "viandes cuites": "chicken", "charcuteries": "pork",
    "autres produits à base de viande": "chicken", "substituts de viande": "chicken",
    "substituts de charcuterie": "chicken",
    "poissons crus": "salmon", "poissons cuits": "salmon",
    "produits à base de poissons et produits de la mer": "salmon",
    "mollusques et crustacés crus": "farmed_shrimp", "mollusques et crustacés cuits": "farmed_shrimp",
    "fromages": "cheese", "produits laitiers frais et assimilés": "yogurt", "laits": "milk",
    "crèmes et spécialités à base de crème": "cream",
    "beurres": "butter", "glaces": "ice_cream", "desserts glacés": "ice_cream",
    "légumes": "tomatoes", "fruits": "apples", "fruits à coque et graines oléagineuses": "avocado",
    "pommes de terre et autres tubercules": "potatoes", "légumineuses": "rice",
    "céréales de petit-déjeuner et biscuits": "cereal", "gâteaux et pâtisseries": "crackers",
    "pains et viennoiseries": "bread", "pâtes, riz et céréales": "pasta", "farines et pâtes à tarte": "bread",
    "boissons sans alcool": "soda", "boisson alcoolisées": "wine", "sorbets": "juice",
    "chocolats et produits à base de chocolat": "chocolate", "confiseries non chocolatées": "chocolate",
    "confitures et assimilés": "juice",
    "sauces": "tomatoes", "condiments": "tomatoes", "aides culinaires": "tomatoes",
    "ingrédients divers": "rice",
    "herbes": "leafy_greens", "épices": "leafy_greens",
    "margarines": "butter",
}

# Checked before the per-subgroup default above; first keyword match wins.
DONOR_KEYWORD_GROUPS: list[tuple[set[str], list[tuple[str, str]]]] = [
    (
        {"viandes crues", "viandes cuites", "charcuteries", "autres produits à base de viande",
         "substituts de viande", "substituts de charcuterie"},
        [
            ("beef", "beef"), ("bœuf", "beef"), ("veal", "beef"), ("veau", "beef"),
            ("pork", "pork"), ("porc", "pork"), ("ham", "pork"), ("bacon", "pork"),
            ("lamb", "lamb"), ("agneau", "lamb"), ("mutton", "lamb"),
            ("turkey", "turkey"), ("dinde", "turkey"), ("duck", "turkey"), ("goose", "turkey"),
            ("chicken", "chicken"), ("poulet", "chicken"), ("hen", "chicken"), ("capon", "chicken"),
        ],
    ),
    (
        {"poissons crus", "poissons cuits", "produits à base de poissons et produits de la mer",
         "mollusques et crustacés crus", "mollusques et crustacés cuits"},
        [
            ("tuna", "canned_tuna"), ("thon", "canned_tuna"),
            ("shrimp", "farmed_shrimp"), ("prawn", "farmed_shrimp"), ("crevette", "farmed_shrimp"),
            ("salmon", "salmon"),
        ],
    ),
    (
        {"légumes"},
        [
            ("tomato", "tomatoes"),
            ("spinach", "leafy_greens"), ("lettuce", "leafy_greens"), ("cabbage", "leafy_greens"),
            ("kale", "leafy_greens"), ("chard", "leafy_greens"),
            ("carrot", "root_vegetables"), ("onion", "root_vegetables"), ("leek", "root_vegetables"),
            ("garlic", "root_vegetables"), ("beet", "root_vegetables"), ("turnip", "root_vegetables"),
            ("radish", "root_vegetables"),
        ],
    ),
    (
        {"fruits"},
        [
            ("banana", "bananas"),
            ("orange", "citrus"), ("lemon", "citrus"), ("lime", "citrus"), ("grapefruit", "citrus"),
            ("strawberry", "berries"), ("raspberry", "berries"), ("blueberry", "berries"),
            ("cherry", "berries"), ("grape", "berries"),
            ("avocado", "avocado"),
        ],
    ),
    (
        {"pâtes, riz et céréales"},
        [
            ("rice", "rice"), ("riz", "rice"), ("quinoa", "rice"), ("couscous", "rice"),
            ("oat", "oats"), ("avoine", "oats"),
            ("pasta", "pasta"), ("noodle", "pasta"),
        ],
    ),
    (
        {"boissons sans alcool"},
        [
            ("coffee", "coffee"), ("cocoa", "coffee"), ("chicory", "coffee"),
            ("tea", "tea"), ("juice", "juice"), ("nectar", "juice"),
        ],
    ),
    (
        {"boisson alcoolisées"},
        [("beer", "beer"), ("cider", "beer"), ("wine", "wine"), ("champagne", "wine")],
    ),
]

# Subgroups (or name keywords within them) that get accurate hardcoded
# nutrition instead of an inherited donor, because the real values are
# simple and well-established for these single-ingredient staples.
WATER_SUBGROUP = "eaux"
SUGAR_HONEY_SUBGROUP = "sucres, miels et assimilés"
OIL_SUBGROUPS = {"huiles et graisses végétales", "huiles de poissons", "autres matières grasses"}
NEAR_ZERO_SUBGROUPS = {"sels"}  # table salt etc: negligible kcal/protein/carb/fat

WATER_NUTRITION = {"kcalPerKg": 0, "proteinGPerKg": 0, "carbsGPerKg": 0, "fatGPerKg": 0, "typicalMassKg": 1.5}
NEAR_ZERO_NUTRITION = {"kcalPerKg": 0, "proteinGPerKg": 0, "carbsGPerKg": 0, "fatGPerKg": 0, "typicalMassKg": 0.5}
HONEY_NUTRITION = {"kcalPerKg": 3040, "proteinGPerKg": 3, "carbsGPerKg": 820, "fatGPerKg": 0, "typicalMassKg": 0.5}
SUGAR_NUTRITION = {"kcalPerKg": 3870, "proteinGPerKg": 0, "carbsGPerKg": 1000, "fatGPerKg": 0, "typicalMassKg": 1.0}
OIL_NUTRITION = {"kcalPerKg": 8840, "proteinGPerKg": 0, "carbsGPerKg": 0, "fatGPerKg": 1000, "typicalMassKg": 1.0}


def pick_donor_id(subgroup: str, name: str) -> str | None:
    name_lower = name.lower()
    for subgroups, overrides in DONOR_KEYWORD_GROUPS:
        if subgroup not in subgroups:
            continue
        for kw, donor_id in overrides:
            if kw in name_lower:
                return donor_id
    return DONOR_DEFAULT.get(subgroup)


def nutrition_for_new_category(subgroup: str, name: str, legacy_by_id: dict[str, dict]) -> dict:
    if subgroup == WATER_SUBGROUP:
        return dict(WATER_NUTRITION)
    if subgroup in NEAR_ZERO_SUBGROUPS:
        return dict(NEAR_ZERO_NUTRITION)
    if subgroup == SUGAR_HONEY_SUBGROUP:
        return dict(HONEY_NUTRITION) if "honey" in name.lower() or "miel" in name.lower() else dict(SUGAR_NUTRITION)
    if subgroup in OIL_SUBGROUPS:
        return dict(OIL_NUTRITION)

    donor_id = pick_donor_id(subgroup, name)
    if donor_id is None:
        raise ValueError(f"No nutrition donor configured for subgroup {subgroup!r} (product {name!r})")
    donor = legacy_by_id[donor_id]
    return {
        "kcalPerKg": donor["kcalPerKg"],
        "proteinGPerKg": donor["proteinGPerKg"],
        "carbsGPerKg": donor["carbsGPerKg"],
        "fatGPerKg": donor["fatGPerKg"],
        "typicalMassKg": donor["typicalMassKg"],
    }


# ---------------------------------------------------------------------------
# 7. Stable id generation + final assembly.
# ---------------------------------------------------------------------------


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return slug


def make_unique_id(name: str, used_ids: set[str]) -> str:
    base = slugify(name)
    if base not in used_ids:
        used_ids.add(base)
        return base
    i = 2
    while f"{base}_{i}" in used_ids:
        i += 1
    unique = f"{base}_{i}"
    used_ids.add(unique)
    return unique


if __name__ == "__main__":
    legacy = json.loads(LEGACY_PATH.read_text())
    legacy_by_id = {c["id"]: c for c in legacy}
    used_ids = {c["id"] for c in legacy}

    records = load_agribalyse_records()
    print(f"Loaded {len(records)} Agribalyse rows with a name + CO2 figure")
    collapsed = collapse_records(records)
    total = sum(len(v) for v in collapsed.values())
    print(f"Collapsed into {total} distinct products across {len(collapsed)} (group, subgroup) buckets")

    # (subgroup, name) -> co2_per_kg lookup across ALL collapsed products (not
    # just the curated subset) for legacy refinement matching. Keyed by
    # subgroup as well as name since raw and cooked subgroups can collapse to
    # an identical product name (see LEGACY_AGRIBALYSE_MATCH's note above).
    by_subgroup_name: dict[tuple[str, str], float] = {}
    for (_group, subgroup), products in collapsed.items():
        for p in products:
            by_subgroup_name[(subgroup, p["name"])] = p["co2_per_kg"]

    cheese_products = collapsed.get(CHEESE_SUBGROUP_KEY, [])
    cheese_avg = sum(p["co2_per_kg"] for p in cheese_products) / len(cheese_products)

    refine_legacy_categories(legacy, by_subgroup_name, cheese_avg)

    selection: dict[tuple[str, str], list[dict]] = {}
    for key, products in collapsed.items():
        selection[key] = select_products(key, products)
    total_selected = sum(len(v) for v in selection.values())
    print(f"Selected {total_selected} new category candidates")

    new_categories = []
    for (ag_group, subgroup), products in selection.items():
        app_group = map_group(ag_group, subgroup)
        for p in products:
            nutrition = nutrition_for_new_category(subgroup, p["name"], legacy_by_id)
            new_categories.append(
                {
                    "name": p["name"],
                    "_subgroup": subgroup,  # used only to disambiguate name collisions below
                    "group": app_group,
                    "kgCo2ePerKg": round(p["co2_per_kg"], 2),
                    **nutrition,
                }
            )

    # The 2nd-comma collapse can produce the identical name from both a raw
    # ("crues"/"crus") and cooked ("cuites"/"cuits") subgroup (e.g. "Lamb,
    # leg" raw vs cooked) — both are legitimate, differently-valued products,
    # but showing two identically-labelled chips in the picker would be
    # confusing, so any such collision gets a "(raw)"/"(cooked)" suffix.
    by_name: dict[str, list[dict]] = defaultdict(list)
    for c in new_categories:
        by_name[c["name"]].append(c)
    for name, group in by_name.items():
        if len(group) <= 1:
            continue
        for c in group:
            sub = c["_subgroup"]
            if "crue" in sub or "cru" in sub:
                c["name"] = f"{name} (raw)"
            elif "cuite" in sub or "cuit" in sub:
                c["name"] = f"{name} (cooked)"

    for c in new_categories:
        del c["_subgroup"]

    # Assign final ids from the (possibly disambiguated) names.
    new_categories = [{"id": make_unique_id(c["name"], used_ids), **c} for c in new_categories]

    all_categories = legacy + new_categories
    all_categories.sort(key=lambda c: (GROUP_ORDER.index(c["group"]), c["name"]))

    OUT_PATH.write_text(json.dumps(all_categories, indent=2) + "\n")
    print(f"Wrote {len(all_categories)} categories ({len(legacy)} refined legacy + {len(new_categories)} new) to {OUT_PATH}")
