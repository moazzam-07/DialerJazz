import os
import argparse
import json
import time
import requests

def get_apify_token():
    """Retrieves Apify API Token from environment."""
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        # Check if loaded from .env (python-dotenv might be needed if not auto-loaded)
        # Using simple check
        try:
             from dotenv import load_dotenv
             load_dotenv()
             token = os.getenv("APIFY_API_TOKEN")
        except ImportError:
            pass
            
    if not token:
        # Warning instead of error to allow help/parsing to run
        return None
    return token

def scrape_instagram_hashtag(query, limit=10):
    """Scrapes Instagram posts for a specific hashtag using Apify REST API."""
    token = get_apify_token()
    if not token:
        print("Error: APIFY_API_TOKEN is missing from .env")
        return []

    print(f"Scraping Instagram # {query} (Limit: {limit})...")
    
    # Using 'apify/instagram-scraper' via REST API
    # Docs: https://docs.apify.com/api/v2#/reference/actors/run-collection/run-actor
    actor_id = "apify/instagram-scraper"
    url = f"https://api.apify.com/v2/acts/{actor_id}/runs?token={token}"
    
    run_input = {
        "search": query,
        "searchType": "hashtag",
        "resultsType": "posts",
        "searchLimit": 1, 
        "resultsLimit": limit,
    }
    
    try:
        # 1. Start the Actor
        print(f"Starting Apify Actor ({actor_id})...")
        start_resp = requests.post(url, json=run_input)
        
        if start_resp.status_code != 201:
            print(f"Failed to start actor: {start_resp.status_code} {start_resp.text}")
            return []
            
        run_data = start_resp.json().get('data', {})
        run_id = run_data.get('id')
        dataset_id = run_data.get('defaultDatasetId')
        
        if not run_id:
            print("No run ID returned.")
            return []

        print(f"Run started (ID: {run_id}). Waiting for completion...")
        
        # 2. Poll for completion
        # We could use `waitForFinish=1` query param above, but manual polling gives us ability to print status
        while True:
            time.sleep(5)
            status_url = f"https://api.apify.com/v2/acts/runs/{run_id}?token={token}"
            status_resp = requests.get(status_url)
            status_data = status_resp.json().get('data', {})
            status = status_data.get('status')
            
            print(f"Status: {status}")
            
            if status in ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']:
                break
                
        if status != 'SUCCEEDED':
            print(f"Run failed with status: {status}")
            return []

        # 3. Fetch Results
        print(f"Fetching results from dataset {dataset_id}...")
        dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={token}"
        items_resp = requests.get(dataset_url)
        
        if items_resp.status_code != 200:
            print(f"Failed to get items: {items_resp.status_code}")
            return []
            
        dataset_items = items_resp.json()
        
        results = []
        for item in dataset_items:
            # Extract relevant fields
            post_data = {
                "id": item.get("id"),
                "url": item.get("url"),
                "caption": item.get("caption"),
                "likesCount": item.get("likesCount"),
                "commentsCount": item.get("commentsCount"),
                "timestamp": item.get("timestamp"),
                "ownerUsername": item.get("ownerUsername") 
            }
            results.append(post_data)
            
        return results

    except Exception as e:
        print(f"An error occurred with Apify HTTP: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Research Instagram using Apify (Rest API).")
    parser.add_argument("query", help="Hashtag or Search term (without #)")
    parser.add_argument("--limit", type=int, default=5, help="Max posts to retrieve")
    parser.add_argument("--output", default="instagram_research.json", help="Output JSON file path")
    
    args = parser.parse_args()
    
    try:
        data = scrape_instagram_hashtag(args.query, args.limit)
        
        # Output directory check
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"Successfully saved {len(data)} items to {args.output}")

    except Exception as e:
        print(f"Execution failed: {e}")

if __name__ == "__main__":
    main()
