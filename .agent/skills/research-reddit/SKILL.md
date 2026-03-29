---
name: research-reddit
description: Search for Reddit posts to identify trends, pain points, and discussions within specific subreddits or globally.
---

# Research Reddit

## Goal
Search for Reddit posts to identify trends, pain points, and discussions within specific subreddits or globally.

## Inputs
1.  **Query**: Search term.
2.  **Subreddit** (Optional): Specific subreddit to search (default: "all").
3.  **Limit** (Optional): Max posts to retrieve (default: 10).
4.  **Output**: Path to save JSON results.

## Tools
*   `scripts/research_reddit.py`

## Prerequisites
*   `pip install requests`
*   Optional: `pip install praw` and set `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` in `.env` for authenticated usage (higher limits).
*   If PRAW is missing or credentials aren't set, it falls back to public JSON scraping.

## Usage

```bash
# Public Search (No Auth or Auth)
python .agent/skills/research-reddit/scripts/research_reddit.py "AI Agents" --limit 20 --output "reddit_results.json"

# Specific Subreddit
python .agent/skills/research-reddit/scripts/research_reddit.py "SaaS Ideas" --subreddit "SaaS" --limit 15
```

## Output
Returns a JSON file with a list of posts containing:
*   Title
*   Score (Upvotes)
*   Number of Comments
*   URL
*   Selftext (Body preview)
*   Subreddit
*   Permalink
