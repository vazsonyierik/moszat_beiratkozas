from playwright.sync_api import sync_playwright
import time

def verify_dates():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # Navigate to the local server
        page.goto("http://localhost:8000/idopont.html?test=true")

        # Wait a bit for React to render
        time.sleep(3)

        # Take a screenshot of the desktop view
        page.screenshot(path="/home/jules/verification/screenshots/desktop_empty_filter.png", full_page=True)

        # Now click the filter to collapse it
        page.click("text=Szűrés")
        time.sleep(1)
        page.screenshot(path="/home/jules/verification/screenshots/desktop_empty_filter_collapsed.png", full_page=True)

        print("Screenshots saved")
        browser.close()

if __name__ == "__main__":
    verify_dates()
