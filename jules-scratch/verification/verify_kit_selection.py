from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Click the dropdown to open it
    page.click('div:has-text("Drum Kit") >> nth=0')

    # Click the "808" option
    page.click('div[role="option"]:has-text("808")')

    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
