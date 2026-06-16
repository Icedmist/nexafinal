import json

log_path = "/home/snow/.gemini/antigravity/brain/9e2b0f9a-9f48-494d-b7fd-c1436efae11b/.system_generated/logs/overview.txt"
with open(log_path, "r") as f:
    for line in f:
        try:
            data = json.loads(line.strip())
            step = data.get("step_index", 0)
            if 1214 <= step <= 1224:
                print(f"Step {step} JSON:")
                print(json.dumps(data, indent=2))
                print("="*80)
        except Exception as e:
            pass
