import json
import re

log_path = "/home/snow/.gemini/antigravity/brain/9e2b0f9a-9f48-494d-b7fd-c1436efae11b/.system_generated/logs/overview.txt"

keywords = ["photo", "textile", "restaurant", "provision", "nexa-new", "layout", "view"]

with open(log_path, 'r') as f:
    for idx, line in enumerate(f):
        try:
            data = json.loads(line.strip())
            content = data.get("content", "")
            if any(kw in content.lower() for kw in keywords):
                print(f"Line {idx+1}, Step {data.get('step_index')}:")
                print(content[:500])
                print("-" * 40)
        except Exception as e:
            pass
