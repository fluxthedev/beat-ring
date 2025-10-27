from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device
        context = browser.new_context(**p.devices['iPhone 11'])
        page = context.new_page()

        try:
            page.goto("http://localhost:3000/beat-ring")

            # Wait for the page to be fully loaded
            page.wait_for_load_state('networkidle')

            # Wait for the main canvas to be visible first
            canvas = page.locator("canvas")
            expect(canvas).to_be_visible(timeout=10000)

            # Now, wait for the mixer to be visible
            mixer = page.locator("h2:has-text('Mixer')")
            expect(mixer).to_be_visible()

            # Target the first volume slider
            volume_slider = page.get_by_role('slider').first
            expect(volume_slider).to_be_visible()

            # Get the bounding box of the slider
            box = volume_slider.bounding_box()
            if box:
                # Click in the middle of the slider to change its value
                page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)

            page.screenshot(path="jules-scratch/verification/verification_mobile.png")
        except Exception as e:
            print(f"An error occurred: {e}")
            print("Page content:")
            print(page.content())
        finally:
            browser.close()

run()
