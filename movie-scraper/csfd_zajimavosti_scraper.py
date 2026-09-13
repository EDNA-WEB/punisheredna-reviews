import asyncio
import json
import os
import re
import urllib.parse
from playwright.async_api import async_playwright

BASE_URL = "https://www.csfd.cz"


def load_movies(filename="moje_filmy.txt"):
    """Načíta zoznam filmov a seriálov zo súboru."""
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


async def scrape_csfd_trivia(page, title, year):
    """Vyhľadá film na ČSFD.cz, prejde na /zajimavosti/ a extrahuje prvých 10 v češtine."""
    query = f"{title} {year}" if year else title
    search_url = f"{BASE_URL}/hledat/?q={urllib.parse.quote(query)}"

    print(f"  -> Vyhľadávam na ČSFD.cz: '{query}'")

    await page.goto(search_url, wait_until="domcontentloaded", timeout=25000)

    current_url = page.url
    target_url = None

    if "/film/" in current_url:
        target_url = current_url
    else:
        selectors = [
            "article.article h3 a",
            ".search-films article h3 a",
            ".main-movies article h3 a",
            "a[href*='/film/']"
        ]

        for sel in selectors:
            elem = await page.query_selector(sel)
            if elem:
                href = await elem.get_attribute("href")
                if href and "/film/" in href:
                    target_url = BASE_URL + href if href.startswith("/") else href
                    break

    if not target_url:
        return None

    clean_base = re.sub(r"/(prehled|prehlad|galerie|videa|recenze|diskuse|zajimavosti)/?$", "", target_url.rstrip("/"))
    trivia_url = clean_base + "/zajimavosti/"

    print(f"  -> Prechádzam na zaujímavosti: {trivia_url}")
    await page.goto(trivia_url, wait_until="domcontentloaded", timeout=25000)

    # Zavretie cookie okna ak existuje
    try:
        cookie_btn = await page.query_selector("#didomi-notice-agree-button")
        if cookie_btn:
            await cookie_btn.click()
            await page.wait_for_timeout(200)
    except Exception:
        pass

    h1_elem = await page.query_selector("h1")
    item_title = (await h1_elem.inner_text()).strip() if h1_elem else title

    trivia_list = []

    trivia_selectors = [
        ".trivia-element",
        ".box-trivia article",
        ".trivia-list article",
        ".article-content",
        "article.article",
        ".trivia-item",
        "ul.trivia-list li"
    ]

    for sel in trivia_selectors:
        elements = await page.query_selector_all(sel)
        for el in elements:
            text = (await el.inner_text()).strip()
            text = re.sub(r"\s+", " ", text)

            if text and len(text) > 25 and not text.startswith("Viac") and not text.startswith("Zobrazit"):
                if text not in trivia_list:
                    trivia_list.append(text)

            if len(trivia_list) >= 10:
                break

        if len(trivia_list) >= 10:
            break

    return {
        "title": item_title,
        "trivia_url": trivia_url,
        "trivia_count": len(trivia_list),
        "trivia": trivia_list
    }


async def main():
    items = load_movies("moje_filmy.txt")
    if not items:
        print("[-] Súbor 'moje_filmy.txt' je prázdny alebo neexistuje.")
        return

    print(f"=== ŠTART SCRAPOVANIA ČSFD ZAUJÍMAVOSTÍ IN CS ({len(items)} položiek) ===\n")
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        # Konfigurácia prehliadača pre ČESKÝ JAZYK (vynútené hlavičky + cookie)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="cs-CZ",
            extra_http_headers={
                "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8"
            },
            viewport={"width": 1280, "height": 800}
        )

        # Nastavenie cookie pre preferenciu českého jazyka
        await context.add_cookies([{
            "name": "lang",
            "value": "cs",
            "domain": ".csfd.cz",
            "path": "/"
        }])

        page = await context.new_page()

        for idx, item in enumerate(items, 1):
            title = item["title"]
            year = item["year"]
            print(f"[{idx}/{len(items)}] Spracovávam: '{title}'" + (f" ({year})" if year else ""))

            for attempt in range(1, 3):
                try:
                    data = await scrape_csfd_trivia(page, title, year)
                    if data:
                        results.append({
                            "search_title": title,
                            "search_year": year,
                            "status": "SUCCESS",
                            "csfd_trivia_data": data
                        })
                        print(f"  [✔] Načítané! Získaných zaujímavostí: {data['trivia_count']}/10")
                        break
                    else:
                        print("  [X] Film sa nenašiel.")
                        break
                except Exception as e:
                    if attempt == 1:
                        print(f"  [-] Timeout/Chyba, skúšam znova...")
                        await asyncio.sleep(2)
                    else:
                        print(f"  [-] Zlyhalo spracovanie: {e}")

            # Ukladanie do JSON
            with open("csfd_zajimavosti.json", "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=4)

            await asyncio.sleep(1.5)

        await browser.close()

    print("\n=== HOTOVO! Zaujímavosti v češtine sú uložené v 'csfd_zajimavosti.json'. ===")


if __name__ == "__main__":
    asyncio.run(main())