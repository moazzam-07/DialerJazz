import os
import argparse
import json
import requests
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_reddit_instance():
    """Initializes and returns the Reddit PRAW instance if credentials exist."""
    try:
        import praw
    except ImportError:
        print("PRAW library not found. Authentication disabled.")
        return None

    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    user_agent = os.getenv("REDDIT_USER_AGENT", "python:research_agent:v1")

    if not client_id or not client_secret:
        return None

    return praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent
    )

def search_reddit_json(query, subreddit_name="all", limit=10):
    """Searches Reddit using the public JSON endpoint (No Auth)."""
    print(f"[No-Auth] Searching r/{subreddit_name} for '{query}' using JSON endpoint...")
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    results = []
    
    # URL encoded search
    if subreddit_name == "all":
        url = f"https://www.reddit.com/search.json?q={query}&limit={limit}"
    else:
        url = f"https://www.reddit.com/r/{subreddit_name}/search.json?q={query}&restrict_sr=1&limit={limit}"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Error {response.status_code}: {response.text}")
            return []
            
        data = response.json()
        posts = data.get('data', {}).get('children', [])
        
        for post in posts:
            p_data = post.get('data', {})
            post_obj = {
                "id": p_data.get('id'),
                "title": p_data.get('title'),
                "score": p_data.get('score'),
                "num_comments": p_data.get('num_comments'),
                "url": p_data.get('url'),
                "selftext": p_data.get('selftext', '')[:500],
                "created_utc": p_data.get('created_utc'),
                "subreddit": p_data.get('subreddit'),
                "permalink": f"https://www.reddit.com{p_data.get('permalink')}"
            }
            results.append(post_obj)
            
        # Modest delay to be nice
        time.sleep(1)
        return results

    except Exception as e:
        print(f"JSON Scraping Error: {e}")
        return []

def search_reddit(query, subreddit_name="all", limit=10):
    """Searches Reddit using PRAW if available, else falls back to JSON."""
    reddit = get_reddit_instance()
    
    if not reddit:
        print("PRAW credentials missing. Falling back to public JSON scraping.")
        return search_reddit_json(query, subreddit_name, limit)
    
    print(f"[Authenticated] Searching r/{subreddit_name} for '{query}' (Limit: {limit})...")
    
    results = []
    try:
        if subreddit_name.lower() == "all":
            subreddit = reddit.subreddit("all")
        else:
            subreddit = reddit.subreddit(subreddit_name)

        # Search the subreddit
        search_results = subreddit.search(query, limit=limit)

        for post in search_results:
            post_data = {
                "id": post.id,
                "title": post.title,
                "score": post.score,
                "num_comments": post.num_comments,
                "url": post.url,
                "selftext": post.selftext[:500] if post.selftext else "", # Truncate body
                "created_utc": post.created_utc,
                "subreddit": post.subreddit.display_name,
                "permalink": f"https://www.reddit.com{post.permalink}"
            }
            results.append(post_data)
            
        return results

    except Exception as e:
        print(f"An error occurred while searching Reddit: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Research Reddit posts (Auth or No-Auth).")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--subreddit", default="all", help="Subreddit to search (default: all)")
    parser.add_argument("--limit", type=int, default=10, help="Max posts to retrieve")
    parser.add_argument("--output", default="reddit_research.json", help="Output JSON file path")
    
    args = parser.parse_args()
    
    try:
        data = search_reddit(args.query, args.subreddit, args.limit)
        
        # Ensure output directory exists
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"Successfully saved {len(data)} posts to {args.output}")

    except ValueError as ve:
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"Execution failed: {e}")

if __name__ == "__main__":
    main()
