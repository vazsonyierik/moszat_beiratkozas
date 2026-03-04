from playwright.sync_api import sync_playwright
import os

def verify_deadline_reports():
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # intercept the firebase functions if necessary
        page.route("**/*", lambda route: route.continue_())

        page.goto("http://localhost:8080/index.html?admin=true&test=true")

        try:
            page.wait_for_selector("text=Határidő Riportok (BÉTA)", timeout=5000)
            page.click("text=Határidő Riportok (BÉTA)")

            page.wait_for_selector("text=Fázis Szűrő")

            page.screenshot(path="/home/jules/verification/deadline_reports.png", full_page=True)
            print("Success!")
        except Exception as e:
            print("Error:", e)
            page.screenshot(path="/home/jules/verification/error.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify_deadline_reports()