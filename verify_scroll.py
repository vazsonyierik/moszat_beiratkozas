from playwright.sync_api import sync_playwright
import time

def verify_scroll():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # Navigate to the local server
        page.goto("http://localhost:8000/idopont.html?test=true")

        # Wait a bit for React to render
        time.sleep(3)

        # Take a screenshot of the desktop view
        page.screenshot(path="/home/jules/verification/screenshots/desktop_before_filter.png", full_page=True)

        # Click a random filter that won't have results to trigger empty state (e.g. Elsősegély) but specifically in the filter panel
        page.click("button:has-text('Elsősegély')")
        time.sleep(1)

        page.screenshot(path="/home/jules/verification/screenshots/desktop_after_filter_empty.png", full_page=True)
        print("Screenshots saved")

        browser.close()

if __name__ == "__main__":
    verify_scroll()
