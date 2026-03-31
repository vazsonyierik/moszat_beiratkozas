from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    # Add dummy data directly to the page since Firestore isn't connected in this simple test environment
    page.goto("http://localhost:8000/idopont.html?test=true")
    page.wait_for_timeout(2000)

    # We need to set up mock data for the UI to show.
    # Easiest way is to inject a test script into the page that overrides the state or mock the database.
    # Since we can't easily mock firebase from here, let's just create a screenshot of the empty state
    # to show the new FABs, and we can inspect the code changes to be sure.
    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_timeout(2000)

    # Check what FABs are visible
    page.screenshot(path="/home/jules/verification/screenshots/empty_state.png")

    # Click Info to see the modal
    page.get_by_title("Fontos tudnivalók jelentkezés előtt").first.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/info_modal.png")
    page.get_by_role("button", name="Bezárás").click()
    page.wait_for_timeout(1000)

    # Click Filter to see the modal
    page.get_by_title("Szűrés és kategóriák").click()
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/filter_modal.png")

    # Look for the modal close button, it should be the second button in the header or similar
    # In the code: <button onClick=${() => setIsMobileFilterModalOpen(false)} ...> <XIcon /> </button>
    page.locator('header button').last.click()
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
