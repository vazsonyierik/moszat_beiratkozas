
from playwright.sync_api import sync_playwright

def verify_console():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        errors = []
        page.on("pageerror", lambda err: errors.append(err))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

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
