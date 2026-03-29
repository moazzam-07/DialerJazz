import os
import argparse
import json
import requests
import isodate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_api_key():
    """Retrieves API Key from environment."""
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise ValueError("YOUTUBE_API_KEY not found in environment variables.")
    return api_key

def search_videos(query, max_results=10):
    """Searches for videos on YouTube using direct REST API (requests)."""
    api_key = get_api_key()
    print(f"Searching for '{query}' (Max: {max_results})...")
    
    base_url = "https://www.googleapis.com/youtube/v3"
    results = []

    try:
        # 1. Search for video IDs
        search_params = {
            "part": "id,snippet",
            "q": query,
            "type": "video",
            "maxResults": max_results,
            "key": api_key
        }
        
        search_resp = requests.get(f"{base_url}/search", params=search_params)
        
        if search_resp.status_code != 200:
            print(f"Search API Error {search_resp.status_code}: {search_resp.text}")
            return []
            
        search_data = search_resp.json()
        video_ids = [item['id']['videoId'] for item in search_data.get('items', [])]
        
        if not video_ids:
            print("No videos found.")
            return []

        # 2. Get detailed statistics for these videos
        video_params = {
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(video_ids),
            "key": api_key
        }

        videos_resp = requests.get(f"{base_url}/videos", params=video_params)
        
        if videos_resp.status_code != 200:
            print(f"Videos API Error {videos_resp.status_code}: {videos_resp.text}")
            return []

        videos_data = videos_resp.json()

        for item in videos_data.get('items', []):
            snippet = item['snippet']
            stats = item['statistics']
            content_details = item['contentDetails']
            
            # Safe parsing of duration
            try:
                duration_sec = isodate.parse_duration(content_details['duration']).total_seconds()
            except:
                duration_sec = 0

            video_data = {
                "video_id": item['id'],
                "title": snippet['title'],
                "channel_title": snippet['channelTitle'],
                "view_count": int(stats.get('viewCount', 0)),
                "like_count": int(stats.get('likeCount', 0)),
                "comment_count": int(stats.get('commentCount', 0)),
                "duration_iso": content_details['duration'],
                "duration_seconds": duration_sec,
                "published_at": snippet['publishedAt'],
                "url": f"https://www.youtube.com/watch?v={item['id']}",
                "description": snippet.get('description', '')
            }
            results.append(video_data)
            
        return results

    except Exception as e:
        print(f"An error occurred: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Research YouTube videos (Lightweight).")
    parser.add_argument("query", help="Search query for videos")
    parser.add_argument("--limit", type=int, default=10, help="Max number of videos to retrieve")
    parser.add_argument("--output", default="youtube_research.json", help="Output JSON file path")
    
    args = parser.parse_args()
    
    try:
        data = search_videos(args.query, args.limit)
        
        # Ensure output directory exists (if path provided)
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"Successfully saved {len(data)} videos to {args.output}")

    except ValueError as ve:
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"Execution failed: {e}")

if __name__ == "__main__":
    main()
