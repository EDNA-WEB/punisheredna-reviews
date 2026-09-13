import asyncio
import json
import os
import re
import urllib.parse
from playwright.async_api import async_playwright

BASE_URL = "https://www.hellspy.to"


def load_movies(filename="moje_filmy.txt"):
    """Načíta zoznam filmov zo súboru."""
    if not os.path.exists(filename):
        print(f"[-] Súbor '{filename}' neexistuje!")
        return []

    items = []
    with open(filename, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            title = line
            year = None

            match_brackets = re.search(r"^(.*?)\s*\((19\d\d|20\d\d)\)", line)
            if match_brackets:
                title = match_brackets.group(1).strip()
                year = int(match_brackets.group(2))
            elif "," in line:
                parts = line.split(",")
                title = parts[0].strip()
                try:
                    year = int(parts[1].strip())
                except ValueError:
                    year = None
            else:
                match_end_year = re.search(r"^(.*?)\s+(19\d\d|20\d\d)$", line)
                if match_end_year:
                    title = match_end_year.group(1).strip()
                    year = int(match_end_year.group(2))

            items.append({"title": title, "year": year})
    return items


def clean_target_url(raw_url):
    """Vytvorí plnú URL adresu pre Hellspy."""
    if not raw_url:
        return ""
    if raw_url.startswith("/"):
        return BASE_URL + raw_url
    return raw_url


async def search_on_hellspy(page, query_text):
    """Pomocná funkcia na vyhľadanie konkrétneho textu na Hellspy.to."""
    search_url = f"{BASE_URL}/?query={urllib.parse.quote(query_text)}"
    await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)

    # Čakáme, kým sa načíta aspoň jeden výsledok
    try:
        await page.wait_for_selector("a[href*='/video/'], a[href*='query='], .list-group a, article a", timeout=5000)
    except Exception:
        pass

    # Selektory pre priame odkazovacie linky na video/súbor
    selectors = [
        "a[href*='/video/']",
        "div[class*='file'] a",
        "div[class*='video'] a",
        "ul li a",
        "a[href*='query=']"
    ]

    for sel in selectors:
        elements = await page.query_selector_all(sel)
        for el in elements:
            raw_href = await el.get_attribute("href") or ""
            text = (await el.inner_text()).strip()

            # Ignorujeme navigáciu a prázdne linky
            if not raw_href or raw_href == "/" or "nahrat" in raw_href or "podminky" in raw_href:
                continue

            if not text:
                text = (await el.get_attribute("title")) or "Súbor bez názvu"

            # Ak sme našli odkaz na detail videa/súboru
            if "/video/" in raw_href or len(text) > 3:
                return {
                    "found_title": text,
                    "first_link": clean_target_url(raw_href)
                }

    return None


async def scrape_hellspy_item(page, title, year):
    """Vyhľadá film na Hellspy.to (najprv aj s rokom, ak zlyhá, tak len názov)."""
    # 1. Pokus: Hľadáme "Názov Rok"
    if year:
        query_with_year = f"{title} {year}"
        print(f"  -> Skúšam vyhľadať: '{query_with_year}'")
        res = await search_on_hellspy(page, query_with_year)
        if res:
            return {"status": "SUCCESS", **res}

    # 2. Pokus: Hľadáme iba čistý "Názov"
    print(f"  -> Skúšam vyhľadať bez roku: '{title}'")
    res = await search_on_hellspy(page, title)
    if res:
        return {"status": "SUCCESS", **res}

    return {
        "status": "NOT_FOUND",
        "found_title": None,
        "first_link": None
    }


async def main():
    items = load_movies("moje_filmy.txt")
    if not items:
        print("[-] Súbor 'moje_filmy.txt' je prázdny alebo neexistuje.")
        return

    print(f"=== ŠTART SCRAPOVANIA HELLSPY.TO ({len(items)} položiek) ===\n")
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()

        for idx, item in enumerate(items, 1):
            title = item["title"]
            year = item["year"]
            print(f"[{idx}/{len(items)}] Spracovávam: '{title}'" + (f" ({year})" if year else ""))

            res = await scrape_hellspy_item(page, title, year)

            results.append({
                "search_title": title,
                "search_year": year,
                "status": res["status"],
                "hellspy_data": {
                    "found_title": res.get("found_title"),
                    "first_link": res.get("first_link")
                }
            })

            if res["status"] == "SUCCESS":
                print(f"  [✔] Našiel sa odkaz: {res['first_link']}")
            else:
                print("  [X] Žiadny výsledok na Hellspy.")

            # Uloženie do JSON súboru
            with open("hellspy_databaza.json", "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=4)

            await asyncio.sleep(1.5)

        await browser.close()

    print("\n=== HOTOVO! Výsledky sú uložené v 'hellspy_databaza.json'. ===")


if __name__ == "__main__":
    asyncio.run(main())