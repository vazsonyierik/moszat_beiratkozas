import subprocess
import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# I need to see what line caused the syntax error. The easiest way is to run node on it.
