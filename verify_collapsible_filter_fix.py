import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="videos/", viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to idopont.html in test mode...")
        page.goto('http://localhost:8000/idopont.html?test=true')

        # Wait for loading overlay to disappear
        page.wait_for_selector('text="Időpontok betöltése..."', state='hidden', timeout=10000)
        time.sleep(2) # Give it a bit more time

        # Initial state should show everything (no clear button, panel closed)
        page.screenshot(path='desktop_filter_initial_closed.png')
        print("Saved initial closed state layout as desktop_filter_initial_closed.png")

        # Open the filter panel
        print("Opening filter panel...")
        page.click('h3:has-text("Szűrés")')
        time.sleep(1)
        page.screenshot(path='desktop_filter_opened_empty.png')
        print("Saved opened empty state layout as desktop_filter_opened_empty.png")

        # Click 1. modul
        print("Clicking 1. modul...")
        page.click('button:has-text("1. modul")')
        time.sleep(1)

        page.screenshot(path='desktop_filter_mod1_active.png')
        print("Saved filtered state layout as desktop_filter_mod1_active.png")

        # Click Clear filters
        print("Clicking Törlés...")
        page.click('button:has-text("Törlés")')
        time.sleep(1)

        page.screenshot(path='desktop_filter_cleared.png')
        print("Saved cleared state layout as desktop_filter_cleared.png")

        context.close()
        browser.close()
        print("Verification complete.")

if __name__ == '__main__':
    run()
