import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000/idopont.html?test=true')
        time.sleep(3)

        cards = page.locator('h4.font-extrabold').all_inner_texts()
        print("Courses visible on page:")
        for c in cards:
            print("-", c)

        print("Empty messages:")
        print(page.locator('.text-gray-500.text-lg').all_inner_texts())

        browser.close()

if __name__ == '__main__':
    run()
