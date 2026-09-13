import json
import os
import re
import time
import urllib.parse
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,"
        " like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def load_movies_from_file(filename="moje_filmy.txt"):
    """Načíta zoznam filmov a ročníkov zo súboru (formát: Názov, Rok)."""
    if not os.path.exists(filename):
        print(f"[-] Súbor '{filename}' neexistuje! Vytvor ho a vlož doň filmy v tvare: Názov, Rok")
        return []

    movies = []
    with open(filename, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            if "," in line:
                parts = line.split(",")
                title = parts[0].strip()
                try:
                    year = int(parts[1].strip())
                except ValueError:
                    year = None
            else:
                title = line
                year = None

            movies.append({"title": title, "year": year})

    return movies


def search_boxofficemojo_direct(title, year=None):
    """Vyhľadá priame ID filmu cez interné API a porovná rok vyhľadania."""
    clean_title = title.lower().strip()
    first_char = clean_title[0] if clean_title else "a"
    search_api_url = f"https://v3.sg.media-imdb.com/suggestion/{first_char}/{urllib.parse.quote(clean_title)}.json"

    try:
        res = requests.get(search_api_url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if "d" in data and len(data["d"]) > 0:
                best_match_id = None

                for item in data["d"]:
                    imdb_id = item.get("id")
                    item_year = item.get("y")  # Rok vydania z IMDB API

                    if imdb_id and imdb_id.startswith("tt"):
                        # Ak je rok zadaný, hľadáme presnú zhodu roku
                        if year and item_year and int(item_year) == int(year):
                            return f"https://www.boxofficemojo.com/title/{imdb_id}/"

                        # Ak rok nesedí alebo nie je zadaný, uložíme prvý výsledok ako zálohu
                        if not best_match_id:
                            best_match_id = imdb_id

                if best_match_id:
                    return f"https://www.boxofficemojo.com/title/{best_match_id}/"

    except Exception as e:
        print(f"  [-] Chyba pri vyhľadávaní: {e}")

    return None


def extract_table_data(soup):
    """Pomocná funkcia na extrakciu tabuliek."""
    tables_data = []
    tables = soup.find_all("table")
    for table in tables:
        rows_list = []
        headers = [th.get_text(strip=True) for th in table.find_all("th")]

        for tr in table.find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all("td")]
            if cells:
                if headers and len(headers) == len(cells):
                    rows_list.append(dict(zip(headers, cells)))
                else:
                    rows_list.append(cells)
        if rows_list:
            tables_data.append(rows_list)
    return tables_data


def parse_subpage(url):
    """Stiahne podstránku a vytiahne tabuľky."""
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            return extract_table_data(soup)
    except Exception as e:
        print(f"    [-] Chyba pri načítaní podstránky {url}: {e}")
    return []


def parse_full_movie_profile(base_url):
    """Stiahne hlavnú stránku a VŠETKY dostupné podstránky filmu."""
    try:
        response = requests.get(base_url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, "html.parser")

        all_data = {
            "source_url": base_url,
            "financial_summary": {},
            "metadata": {},
            "overview_tables": [],
            "subpages": {
                "international_breakdown": [],
                "weekend_breakdown": [],
                "weekly_breakdown": [],
                "daily_breakdown": [],
            },
        }

        # Názov
        title_el = (
            soup.find("h1", class_="mojo-title-option-heading")
            or soup.find("h1", class_="a-size-large")
            or soup.find("h1")
        )
        all_data["title"] = title_el.get_text(strip=True) if title_el else "N/A"

        # Financial Summary
        performance_section = soup.find("div", class_="mojo-performance-table")
        if performance_section:
            for div in performance_section.find_all(
                "div", class_="mojo-enumerate-format"
            ):
                text_content = div.get_text(" ", strip=True)
                money_match = re.search(r"\$[0-9,]+", text_content)
                percent_match = re.search(r"\([0-9.,]+%\)", text_content)
                label = (
                    text_content.split("$")[0].strip()
                    if "$" in text_content
                    else text_content
                )

                all_data["financial_summary"][label] = {
                    "gross": money_match.group(0) if money_match else "N/A",
                    "percentage": (
                        percent_match.group(0) if percent_match else "N/A"
                    ),
                }

        # Metadáta
        summary_div = soup.find("div", class_="mojo-summary-values")
        if summary_div:
            rows = summary_div.find_all("div", class_="a-section")
            for row in rows:
                spans = row.find_all("span")
                if len(spans) >= 2:
                    key = spans[0].get_text(strip=True)
                    val = (
                        spans[1]
                        .get_text(" ", strip=True)
                        .replace("See full company information", "")
                        .strip()
                    )
                    all_data["metadata"][key] = val

        # Tabuľky z Overview
        all_data["overview_tables"] = extract_table_data(soup)

        # Vyhľadanie podstránok
        nav_tabs = soup.find_all("a", class_="a-tab-heading")
        sub_urls = {}

        for a in nav_tabs:
            href = a.get("href", "")
            text = a.get_text(strip=True).lower()
            full_sub_url = urllib.parse.urljoin(base_url, href)

            if "original" in text or "overview" in text:
                continue
            elif "international" in text:
                sub_urls["international"] = full_sub_url
            elif "weekend" in text:
                sub_urls["weekend"] = full_sub_url
            elif "weekly" in text:
                sub_urls["weekly"] = full_sub_url
            elif "daily" in text:
                sub_urls["daily"] = full_sub_url

        # Stiahnutie dát z podstránok
        for sub_type, sub_url in sub_urls.items():
            print(f"    -> Stahujem podstránku [{sub_type.upper()}]: {sub_url}")
            tables = parse_subpage(sub_url)
            if sub_type == "international":
                all_data["subpages"]["international_breakdown"] = tables
            elif sub_type == "weekend":
                all_data["subpages"]["weekend_breakdown"] = tables
            elif sub_type == "weekly":
                all_data["subpages"]["weekly_breakdown"] = tables
            elif sub_type == "daily":
                all_data["subpages"]["daily_breakdown"] = tables

            time.sleep(1)

        return all_data

    except Exception as e:
        print(f"  [-] Chyba pri spracovaní {base_url}: {e}")
        return None


def main():
    movies_to_scrape = load_movies_from_file("moje_filmy.txt")

    if not movies_to_scrape:
        print("Zoznam filmov je prázdny. Ukončujem.")
        return

    results = []
    total = len(movies_to_scrape)

    print(f"=== ŠTART SCRAPOVANIA PODĽA NÁZVU A ROKU ({total} filmov) ===\n")

    for idx, movie in enumerate(movies_to_scrape, 1):
        title = movie["title"]
        year = movie["year"]

        year_str = f" ({year})" if year else ""
        print(f"[{idx}/{total}] Hľadám: '{title}'{year_str}...")

        mojo_url = search_boxofficemojo_direct(title, year)

        if mojo_url:
            print(f"  -> Nájdená presná URL: {mojo_url}")
            full_data = parse_full_movie_profile(mojo_url)

            if full_data:
                results.append({
                    "search_title": title,
                    "search_year": year,
                    "status": "SUCCESS",
                    "data": full_data
                })
                print("  [✔] Úspešne stiahnutý kompletný profil!")
            else:
                print("  [X] Nepodarilo sa stiahnuť dáta z URL.")
        else:
            print("  [X] Film sa nenašiel (skontroluj názov/rok).")

        # Ukladanie
        with open("moje_filmy_databaza.json", "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=4)

        time.sleep(1.5)

    print("\n=== HOTOVO! Všetky filmy boli presne spárované a uložené. ===")


if __name__ == "__main__":
    main()