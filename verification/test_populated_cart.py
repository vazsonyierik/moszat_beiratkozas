from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # Navigate to the local server
        page.goto("http://localhost:8000/idopont.html")

        # Wait for the courses to load and make sure they are attached
        page.wait_for_selector("button:has-text('Kiválasztom')", state="attached")

        # Open the first few weeks if they are not already open
        # We know weeks are collapsible.
        weeks = page.locator(".flex.justify-between.items-center.p-4.cursor-pointer")
        count = weeks.count()
        # They should be open by default per the user requirement! Let's click just to be sure

        # Click the first 4 "Kiválasztom" buttons that are VISIBLE
        buttons = page.locator("button:has-text('Kiválasztom')")

        # We have to make sure they are visible. So we filter.
        visible_buttons = []
        for i in range(buttons.count()):
            if buttons.nth(i).is_visible():
                visible_buttons.append(buttons.nth(i))

        clicks = min(4, len(visible_buttons))
        for i in range(clicks):
            visible_buttons[i].click()
            page.wait_for_timeout(500) # give it a moment to animate

        # Take screenshot of the populated state
        page.screenshot(path="verification/screenshots/populated_cart_prod.png", full_page=True)

        # Close the browser
        browser.close()

if __name__ == "__main__":
    run()
