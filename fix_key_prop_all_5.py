import subprocess
import re

# I see! HEAD has 0 quoted keys!
# In my previous commit `fix: resolve react crash by applying explicit quotes to htm key properties` I THOUGHT I quoted them, but I didn't!
# Wait, let's verify:

res = subprocess.run(["git", "log", "-n", "1", "--stat"], capture_output=True, text=True)
print(res.stdout)

res2 = subprocess.run(["git", "diff", "HEAD~1", "HEAD"], capture_output=True, text=True)
print(res2.stdout)
