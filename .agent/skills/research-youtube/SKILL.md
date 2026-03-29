---
name: research-youtube
description: Research specific YouTube videos or topics to gather metadata using the YouTube Data API.
---

# Research YouTube

## Goal
Research specific YouTube videos or topics to gather metadata (views, likes, duration, etc.) using the YouTube Data API.

## Inputs
1.  **Query**: Search term.
2.  **Limit** (Optional): Max videos to retrieve (default: 10).
3.  **Output**: Path to save JSON results.

## Tools
*   `scripts/research_youtube.py`

## Prerequisites
*   `YOUTUBE_API_KEY` must be set in `.env`.
*   `pip install requests isodate`

## Usage

```bash
python .agent/skills/research-youtube/scripts/research_youtube.py "AI Agents" --limit 5 --output "yt_results.json"
```

## Output
Returns a JSON file with:
*   Video ID
*   Title
*   Channel Title
*   View/Like/Comment Counts
*   Duration (Seconds & ISO)
*   Published At
*   URL
*   Description
