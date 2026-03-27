from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/AdminPanel.html?test=true")
    page.wait_for_timeout(2000)

    # login if needed. Firebase emulator will auto-login anon if we don't do anything?
    # The AdminPanel expects auth to load. It's a test view though.
    page.screenshot(path="/app/admin_panel_initial.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 1280, "height": 800},
        )
        try:
            run_cuj(page)
        finally:
            browser.close()
