---
name: research-instagram
description: Search for Instagram posts by hashtag using the Apify API to identify trends and content ideas.
---

# Research Instagram

## Goal
Search for Instagram posts by hashtag using the Apify API (`apify/instagram-scraper`) to identify trends and content ideas.

## Inputs
1.  **Query**: The hashtag or search term (e.g., "AIAutomation" or just "AIAutomation" - script adds # if searching by hashtag).
2.  **Limit**: Number of posts to retrieve (Default 5).
3.  **Output**: Path to save the JSON results.

## Tools
*   `scripts/research_instagram.py`

## Prerequisites
*   `APIFY_API_TOKEN` must be set in `.env`.
*   Credits available on your Apify account.
*   `pip install requests`

## Usage

```bash
python .agent/skills/research-instagram/scripts/research_instagram.py "AIAutomation" --limit 10 --output "results.json"
```

## Output
Returns a JSON file containing a list of posts with:
*   URL
*   Caption
*   Likes Count
*   Comments Count
*   Owner Username
