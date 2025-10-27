from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Find the swing slider and set its value to 50
    swing_slider = page.locator('div:has-text("Swing")').locator('span[role="slider"]')

    # Get the bounding box of the slider to click on the right end
    bounding_box = swing_slider.bounding_box()
    if bounding_box:
        # Click on the far right of the slider to set it to max value
        page.mouse.click(bounding_box['x'] + bounding_box['width'] -1, bounding_box['y'] + bounding_box['height'] / 2)


    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
