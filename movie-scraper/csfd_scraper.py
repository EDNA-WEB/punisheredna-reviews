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


def clean_target_url(raw_url):
    """Spracuje ČSFD.cz presmerovaciu URL (target=...) na reálnu cieľovú adresu."""
    if not raw_url:
        return ""

    if "target=" in raw_url:
        try:
            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
            if "target" in parsed and parsed["target"]:
                return urllib.parse.unquote(parsed["target"][0])
        except Exception:
            pass

    if raw_url.startswith("/"):
        return BASE_URL + raw_url

    return raw_url


async def scrape_csfd_item(page, title, year):
    """Vyhľadá položku na ČSFD.cz a vytiahne dáta vrátane liniek pre Kde sledovať a Odkazy."""
    query = f"{title} {year}" if year else title
    search_url = f"{BASE_URL}/hledat/?q={urllib.parse.quote(query)}"

    print(f"  -> Vyhľadávam na ČSFD.cz: '{query}'")
    
    await page.goto(search_url, wait_until="networkidle", timeout=20000)

    # Kontrola presmerovania priamo na detail
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

    clean_base = re.sub(r"/(prehlad|prehled|galerie|videa|recenze|diskuse)/?$", "", target_url.rstrip("/"))
    final_profile_url = clean_base + "/prehled/"

    print(f"  -> Profil nájdený: {final_profile_url}")
    await page.goto(final_profile_url, wait_until="domcontentloaded", timeout=20000)

    # Zavretie cookie okna ak vyskočí
    try:
        cookie_btn = await page.query_selector("#didomi-notice-agree-button")
        if cookie_btn:
            await cookie_btn.click()
            await page.wait_for_timeout(300)
    except Exception:
        pass

    # Titulok
    h1_elem = await page.query_selector("h1")
    item_title = (await h1_elem.inner_text()).strip() if h1_elem else title

    # Typ (Film / Seriál / Epizoda)
    type_el = await page.query_selector(".type")
    item_type = (await type_el.inner_text()).strip() if type_el else "Film"

    # Hodnotenie
    rating_el = await page.query_selector(".rating-average, .box-rating .rating")
    rating_pct = (await rating_el.inner_text()).strip() if rating_el else "N/A"

    rating_cnt_el = await page.query_selector(".rating-count, a.rating-count")
    rating_cnt = (await rating_cnt_el.inner_text()).strip() if rating_cnt_el else "N/A"

    # -------------------------------------------------------------
    # 1. KDE SLEDOVAŤ (VOD Platforiem - ČSFD.cz)
    # -------------------------------------------------------------
    where_to_watch = []
    
    vod_elements = await page.query_selector_all(
        ".box-watch a, .vod-services a, .box-vod a, div[class*='vod'] a, div[class*='watch'] a, .box-watch div[data-href]"
    )

    for el in vod_elements:
        raw_href = (
            await el.get_attribute("href")
            or await el.get_attribute("data-href")
            or await el.get_attribute("data-url")
            or await el.get_attribute("data-target")
            or ""
        )

        platform_name = (await el.inner_text()).strip()

        if not platform_name:
            img = await el.query_selector("img")
            if img:
                platform_name = await img.get_attribute("alt") or await img.get_attribute("title") or ""
        
        if not platform_name:
            platform_name = await el.get_attribute("title") or "VOD Platforma"

        final_link = clean_target_url(raw_href)

        if final_link and final_link != BASE_URL:
            if not any(w["platform"] == platform_name for w in where_to_watch):
                where_to_watch.append({
                    "platform": platform_name,
                    "target_url": final_link
                })

    # -------------------------------------------------------------
    # 2. ODKAZY (IMDb, Oficiálne stránky atď.)
    # -------------------------------------------------------------
    external_links = []
    ext_elements = await page.query_selector_all(".box-links a, .external-stores a, .box-external-links a")

    for el in ext_elements:
        raw_href = (
            await el.get_attribute("href")
            or await el.get_attribute("data-href")
            or await el.get_attribute("data-url")
            or ""
        )
        link_title = (await el.inner_text()).strip() or (await el.get_attribute("title")) or "Odkaz"
        
        final_link = clean_target_url(raw_href)

        if final_link and final_link != BASE_URL:
            external_links.append({
                "title": link_title,
                "target_url": final_link
            })

    # -------------------------------------------------------------
    # 3. TAGY / ŽÁNRE
    # -------------------------------------------------------------
    tags = []
    tag_els = await page.query_selector_all(".box-tags a, .tags a")
    for t in tag_els:
        t_name = (await t.inner_text()).strip()
        t_href = await t.get_attribute("href") or ""
        if t_href:
            tags.append({
                "name": t_name, 
                "link": BASE_URL + t_href if t_href.startswith("/") else t_href
            })

    # -------------------------------------------------------------
    # 4. PREMIÉRY / ROKY
    # -------------------------------------------------------------
    premieres = []
    prem_els = await page.query_selector_all(".box-premieres li, .premieres li")
    for p in prem_els:
        text = (await p.inner_text()).strip()
        if text:
            premieres.append(text)

    # -------------------------------------------------------------
    # 5. SÚVISIACE FILMY A SERIÁLY
    # -------------------------------------------------------------
    related_items = []
    rel_els = await page.query_selector_all(".box-related a[href*='/film/']")
    for r in rel_els:
        r_title = (await r.inner_text()).strip()
        r_href = await r.get_attribute("href") or ""
        if r_href.startswith("/"):
            r_href = BASE_URL + r_href
        if r_title and not any(rel["url"] == r_href for rel in related_items):
            related_items.append({"title": r_title, "url": r_href})

    return {
        "page_url": page.url,
        "type": item_type,
        "title": item_title,
        "rating": {
            "percentage": rating_pct,
            "total_ratings": rating_cnt,
        },
        "where_to_watch": where_to_watch,
        "tags": tags,
        "premieres": premieres,
        "external_links": external_links,
        "related_movies_or_series": related_items,
    }


async def main():
    items = load_movies("moje_filmy.txt")
    if not items:
        print("[-] Súbor 'moje_filmy.txt' je prázdny alebo neexistuje.")
        return

    print(f"=== ŠTART SCRAPOVANIA ČSFD.CZ ({len(items)} položiek) ===\n")
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="cs-CZ",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()

        for idx, item in enumerate(items, 1):
            title = item["title"]
            year = item["year"]
            print(f"[{idx}/{len(items)}] Spracovávam: '{title}'" + (f" ({year})" if year else ""))

            try:
                data = await scrape_csfd_item(page, title, year)
                if data:
                    results.append({
                        "search_title": title,
                        "search_year": year,
                        "status": "SUCCESS",
                        "csfd_data": data
                    })
                    print(f"  [✔] Načítané! Typ: {data['type']} | VOD: {len(data['where_to_watch'])} platforiem | Odkazy: {len(data['external_links'])}")
                else:
                    print("  [X] Položka sa nenašla.")
            except Exception as e:
                print(f"  [-] Chyba pri spracovaní: {e}")

            with open("csfd_databaza.json", "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=4)

            await asyncio.sleep(1.5)

        await browser.close()

    print("\n=== HOTOVO! Dáta z ČSFD.cz sú uložené v 'csfd_databaza.json'. ===")


if __name__ == "__main__":
    asyncio.run(main())