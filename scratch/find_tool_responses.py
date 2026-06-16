import json

log_path = "/home/snow/.gemini/antigravity/brain/9e2b0f9a-9f48-494d-b7fd-c1436efae11b/.system_generated/logs/overview.txt"
with open(log_path, "r") as f:
    for line in f:
        try:
            data = json.loads(line.strip())
            step = data.get("step_index", 0)
            if 1215 <= step <= 1320:
                print(f"--- STEP {step} ({data.get('source')} / {data.get('type')}) ---")
                print("Keys:", list(data.keys()))
                for k, v in data.items():
                    if k not in ['step_index', 'source', 'type', 'status', 'created_at']:
                        print(f"  {k}: {str(v)[:400]}")
        except Exception as e:
            pass
