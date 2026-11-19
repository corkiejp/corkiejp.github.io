import json
import traceback
from datetime import datetime
import ollama
import requests
from bs4 import BeautifulSoup

SEARCH_URL = "http://localhost:8080/search"
MODEL = "qwen3.5:4b"
MAX_RESULTS = 6
MAX_CHARS_PER_PAGE = 2500

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


def fetch_text(url: str) -> str:
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except requests.RequestException:
        return ""

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    return text[:MAX_CHARS_PER_PAGE]


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
        page_text = fetch_text(url)

        pages.append({
            "title": item.get("title", ""),
            "url": url,
            "snippet": item.get("content", ""),
            "page_text": page_text,
        })

    prompt = (
        f"User request:\n{user_prompt}\n\n"
        f"Data:\n{json.dumps(pages, ensure_ascii=False)}"
    )

    print(f"\nSynthesizing digest with {MODEL} (this may take a moment on CPU)...")
    response = ollama.chat(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        think=False,
        options={
            "num_ctx": 8192,
            "temperature": 0.3,
        },
    )

    digest = response.message.content

    # Header containing the original prompt
    header_markdown = f"# Research Digest\n\n> **Prompt:** {user_prompt}\n\n---\n\n"

    # Safely append clickable Markdown links
    sources_markdown = "\n\n## Scraped Sources & References\n"
    for page in pages:
        display_title = page["title"].strip() or page["url"]
        sources_markdown += f"- [{display_title}]({page['url']})\n"

    final_document = header_markdown + digest + sources_markdown

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"digest-{timestamp}.md"

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
