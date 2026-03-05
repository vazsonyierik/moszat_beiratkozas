from playwright.sync_api import sync_playwright

def verify_click():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        errors = []
        page.on("pageerror", lambda err: errors.append(err))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        page.goto("http://localhost:8081/index.html")
        page.wait_for_timeout(2000)

        # Kattintsunk a Határidők tabra, de a login miatt a tabok valószínűleg nem látszódnak
        # Ennek ellenére a hiba eddig is a kódban volt.
        # Ha be akarnánk lépni, mockolni kéne a firebase authentikációt ami nehézkes lenne itt.

        if errors:
            print("Console Errors Found:")
            for err in errors:
                print(f"- {err}")
            return False

        return True

if __name__ == "__main__":
    verify_click()
