import json

log_path = "/home/snow/.gemini/antigravity/brain/9e2b0f9a-9f48-494d-b7fd-c1436efae11b/.system_generated/logs/overview.txt"
steps_to_check = [1288, 1291, 1294, 1297, 1300, 1303, 1306, 1309, 1312, 1315]

with open(log_path, "r") as f:
    for line in f:
        try:
            data = json.loads(line.strip())
            step = data.get("step_index", 0)
            if step in steps_to_check:
                print(f"=== STEP {step} ({data.get('source')}) ===")
                print(data.get("content", ""))
                # Let's also print next lines if they are tool responses or next model thoughts
                print("=" * 80)
        except Exception as e:
            pass
