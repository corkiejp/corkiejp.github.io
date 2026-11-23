import json
import re
import traceback
from datetime import datetime
import requests
from bs4 import BeautifulSoup

SEARCH_URL = "http://localhost:8080/search"
LLAMA_URL = "http://localhost:8085/v1/chat/completions"
MODEL = "gemma-4-E4B-it-Q4_0"
MAX_RESULTS = 10
MAX_CHARS_PER_PAGE = 2000

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

SYSTEM_PROMPT = (
    "You are a concise research assistant. Answer the user's request in clean "
    "Markdown using ONLY the provided search results and page contents.\n"
    "- Cite sources inline using the actual publication or site name in Markdown "
    "links, for example: [Newsweek](https://newsweek.com...). Never write "
    "the literal words 'Source Title'.\n"
    "- Pay attention to each source's 'published_date' field and note when "
    "information comes from older articles.\n"
    "- Use clear headings and bullet points with bold key takeaways.\n"
    "- If sources disagree or lack enough detail, state that clearly instead of guessing."
)


def search_web(query: str) -> list[dict]:
    params = {
        "q": query,
        "category_general": "1",
        "language": "auto",
        "time_range": "",
        "safesearch": "0",
        "theme": "simple",
        "format": "json",
    }
    response = requests.get(SEARCH_URL, params=params, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.json().get("results", [])


def normalize_date(raw_date: str) -> str:
    if not raw_date:
        return ""
    raw_str = str(raw_date).strip()
    m = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", raw_str)
    if m:
        return m.group(1)
    m2 = re.search(r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+20\d{2})\b", raw_str, re.I)
    return m2.group(1) if m2 else ""

def extract_date_from_soup(soup: BeautifulSoup, raw_html: str = "") -> str:
    for tag_name, attrs in [("meta", {"property": "article:published_time"}), ("meta", {"property": "og:updated_time"}), ("meta", {"name": "pubdate"}), ("meta", {"name": "date"}), ("meta", {"itemprop": "date(?:Published|Modified)"})]:
        tag = soup.find(tag_name, attrs=attrs)
        if tag and tag.get("content") and normalize_date(tag["content"]):
            return normalize_date(tag["content"])
    j = re.search(r'"date(?:Published|Modified)"\s*:\s*"([^"]+)"', raw_html)
    if j and normalize_date(j.group(1)):
        return normalize_date(j.group(1))
    t = soup.find("time")
    return normalize_date(t.get("datetime") or t.get_text(strip=True)) if t else ""

def fetch_page(url: str) -> tuple[str, str]:
    u = re.search(r"/(20\d{2})/(\d{2})(?:/(\d{2}))?/", url)
    url_date = (f"{u.group(1)}-{u.group(2)}-{u.group(3)}" if u.group(3) else f"{u.group(1)}-{u.group(2)}") if u else ""
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        return "", url_date
    soup = BeautifulSoup(r.text, "html.parser")
    d = extract_date_from_soup(soup, r.text) or url_date
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    txt = soup.get_text(separator="\n", strip=True)
    return txt[:MAX_CHARS_PER_PAGE], (d or normalize_date(txt[:600]))


def main() -> None:
    user_prompt = input("Enter your prompt: ").strip()
    if not user_prompt:
        print("Prompt cannot be empty.")
        return

    results = [
        r for r in search_web(user_prompt)
        if r.get("url") and "youtube.com" not in r["url"] and "youtu.be" not in r["url"]
    ][:MAX_RESULTS]

    pages = []
    for item in results:
        url = item.get("url")
        if not url:
            continue

        print(f"Fetching: {url}")
        page_text, html_date = fetch_page(url)
        searx_date = normalize_date(item.get("publishedDate", ""))
        final_date = searx_date or html_date or "Date unknown"

        pages.append({
            "title": item.get("title", ""),
            "url": url,
            "published_date": final_date,
            "snippet": item.get("content", ""),
            "page_text": page_text,
        })

    prompt = (
        f"User request:\n{user_prompt}\n\n"
        f"Data:\n{json.dumps(pages, ensure_ascii=False)}"
    )

    print(f"\nSynthesizing digest with {MODEL} via llama-server (Vulkan iGPU)...")
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    response = requests.post(LLAMA_URL, json=payload, timeout=600)
    response.raise_for_status()
    digest = response.json()["choices"][0]["message"]["content"]

    header_markdown = f"# Research Digest (llama.cpp)\n\n> **Prompt:** {user_prompt}\n\n---\n\n"

    sources_markdown = "\n\n## Scraped Sources & References\n"
    for page in pages:
        display_title = page["title"].strip() or page["url"]
        sources_markdown += f"- [{display_title}]({page['url']}) *({page['published_date']})*\n"

    final_document = header_markdown + digest + sources_markdown

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"digest-llama-{timestamp}.md"

    with open(filename, "w", encoding="utf-8") as f:
        f.write(final_document)

    print(f"Saved digest to {filename}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
    finally:
        input("\nPress Enter to close...")