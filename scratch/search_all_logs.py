import os
import json
import glob

brain_dir = "/home/snow/.gemini/antigravity/brain"
log_files = glob.glob(os.path.join(brain_dir, "*", ".system_generated", "logs", "overview.txt"))

keywords = ["photo_1", "textiles", "restaurants", "provisions", "photo_2026"]

for log_path in log_files:
    conv_id = log_path.split("/")[-4]
    found = False
    with open(log_path, "r", errors="ignore") as f:
        for line_num, line in enumerate(f):
            if any(kw in line for kw in keywords):
                try:
                    data = json.loads(line.strip())
                    content = data.get("content", "")
                    if any(kw in content for kw in keywords):
                        print(f"Conv {conv_id}, Step {data.get('step_index')}:")
                        print(content[:600])
                        print("-" * 50)
                        found = True
                except:
                    pass
