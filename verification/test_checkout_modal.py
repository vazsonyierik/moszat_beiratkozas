from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Test on mobile layout
        page = browser.new_page(viewport={"width": 400, "height": 800})

        # Navigate to the local server
        page.goto("http://localhost:8000/idopont.html")

        # Click a couple of items
        page.wait_for_selector("button:has-text('Kiválasztom')", state="attached")
        page.wait_for_timeout(1000)

        buttons = page.locator("button:has-text('Kiválasztom')")

        visible_buttons = []
        for i in range(buttons.count()):
            if buttons.nth(i).is_visible():
                visible_buttons.append(buttons.nth(i))

        clicks = min(2, len(visible_buttons))
        for i in range(clicks):
            visible_buttons[i].click()
            page.wait_for_timeout(500)

        # Click the checkout button which on mobile is at the bottom
        checkout_button = page.locator("button:has-text('Tovább a jelentkezéshez')").first
        if checkout_button.is_visible():
            checkout_button.click()
            page.wait_for_timeout(1000)

        # Take screenshot of the mobile modal state
        page.screenshot(path="verification/screenshots/checkout_mobile_prod.png", full_page=True)

        # Close the browser
        browser.close()

if __name__ == "__main__":
    run()
