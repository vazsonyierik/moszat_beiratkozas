import subprocess
import time

def run_tests():
    # Start the server on a known port
    server_process = subprocess.Popen(["python3", "-m", "http.server", "8081"])
    time.sleep(2)

    # Mivel itt nincsenek unit tesztek definiálva a JS kódhoz, legalább azt meg tudjuk nézni, hogy a syntax hibás-e
    # vagy a böngésző futtatása során dob-e hibát a konzolban

    script = """
from playwright.sync_api import sync_playwright

def verify_console():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        errors = []
        page.on("pageerror", lambda err: errors.append(err))

        page.goto("http://localhost:8081/index.html")
        page.wait_for_timeout(3000)

        if errors:
            print("Console Errors Found:")
            for err in errors:
                print(f"- {err}")
            return False

        print("No console errors detected on initial load.")
        return True

if __name__ == "__main__":
    success = verify_console()
    exit(0 if success else 1)
"""
    with open('verify_console.py', 'w') as f:
        f.write(script)

    try:
        result = subprocess.run(["python3", "verify_console.py"], capture_output=True, text=True)
        print(result.stdout)
        if result.returncode != 0:
            print("Tests failed!")
            print(result.stderr)
            return False
    finally:
        server_process.terminate()

    return True

if __name__ == "__main__":
    run_tests()
