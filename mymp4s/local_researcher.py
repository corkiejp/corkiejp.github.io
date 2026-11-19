import os
import json
import requests
import ollama
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path

# Change the SEARCH_URL from /search to /search/num
SEARCH_URL = "http://localhost:8080/search"
MODEL = "llama3.2:3b" 



def search_web(query):
    # Mimic your browser's successful search parameters
    params = {
        "q": query,
        "category_general": "1",
        "language": "auto",
        "time_range": "",
        "safesearch": "0",
        "theme": "simple",
        "format": "json" # <-- This tells SearXNG to return raw data instead of HTML
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    response = requests.get(
        SEARCH_URL,
        params=params,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("results", [])




# Fetch full web page content
def fetch_text(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        return ""
    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def main():
    user_prompt = input("Enter your prompt: ").strip()
    if not user_prompt:
        print("Prompt cannot be empty.")
        return

    results = search_web(user_prompt)

    # For each url in web search result, fetch full content
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

    # Prompt to send to Qwen model with web data
    prompt = f"""
    User request:
    {user_prompt}

    Use these web results and page contents to answer in markdown format.

    Data:
    {json.dumps(pages, ensure_ascii=False)}
    """

    # Invoke local Qwen model 
    response = ollama.chat(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    digest = response.message.content

    # Build a unique filename using today's date and time
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"digest-{timestamp}.md"

    # Save the digest to disk
    with open(filename, "w") as f:
        f.write(digest)
        
            # --- NEW: SAFELY APPEND CLICKABLE SOURCES VIA PYTHON ---
    sources_markdown = "\n\n## Scraped Sources & References\n"
    for page in pages:
        # If a title is blank, use the URL as the text instead
        display_title = page["title"] if page["title"].strip() else page["url"]
        sources_markdown += f"- [{display_title}]({page['url']})\n"
    
    # Merge the AI response with your clean list of links
    final_document = digest + sources_markdown

    # Build a unique filename using today's date and time
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"digest-{timestamp}.md"

    # Save the complete document to disk
    with open(filename, "w") as f:
        f.write(final_document)
    
    print(f"Saved to digest")

if __name__ == "__main__":
    main()