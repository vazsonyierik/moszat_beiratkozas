import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        print("Navigating to idopont.html in test mode...")
        page.goto('http://localhost:8000/idopont.html?test=true')

        # Wait for loading overlay to disappear
        page.wait_for_selector('text="Időpontok betöltése..."', state='hidden', timeout=10000)
        time.sleep(1) # Give it a moment to render the courses

        # Take initial screenshot
        page.screenshot(path='desktop_modules_initial.png')
        print("Saved initial layout as desktop_modules_initial.png")

        # Start Video recording for interaction
        context = browser.new_context(record_video_dir="videos/", viewport={'width': 1280, 'height': 800})
        vid_page = context.new_page()
        vid_page.goto('http://localhost:8000/idopont.html?test=true')
        vid_page.wait_for_selector('text="Időpontok betöltése..."', state='hidden', timeout=10000)
        time.sleep(1)

        # Let's filter to ONLY "1. modul" by clicking "Mind" to toggle off (wait, "Mind" is a reset button, we need to click 2, 3, 4 to turn them off)
        # Actually, clicking "Mind" currently just does: setSelectedModules({ mod1: true, mod2: true, mod3: true, mod4: true })
        # So to select ONLY 1. modul, we should turn off 2, 3, 4
        print("Turning off 2., 3., 4. modul...")
        vid_page.click('button:has-text("2. modul")')
        time.sleep(0.5)
        vid_page.click('button:has-text("3. modul")')
        time.sleep(0.5)
        vid_page.click('button:has-text("4. modul")')
        time.sleep(1)

        vid_page.screenshot(path='desktop_modules_filtered_mod1.png')
        print("Saved filtered layout as desktop_modules_filtered_mod1.png")

        # Click Clear filters
        print("Clicking Összes szűrés törlése...")
        vid_page.click('button:has-text("Összes szűrés törlése")')
        time.sleep(1)

        vid_page.screenshot(path='desktop_modules_cleared.png')
        print("Saved cleared layout as desktop_modules_cleared.png")

        context.close()
        browser.close()
        print("Verification complete.")

if __name__ == '__main__':
    run()
