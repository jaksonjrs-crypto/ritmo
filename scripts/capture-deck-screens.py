"""Capture clean mobile screenshots of Ritmo's core screens for the deck."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("/home/ubuntu/manus-slides/ritmo-implementation-features-mwv0y3w5-ec7b7ca8/assets/screens")
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:8081"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_timeout(2500)
    # Finish onboarding without enabling reminders.
    button = page.get_by_role("button", name="Organizar meu dia")
    if button.count():
        button.first.click()
        page.wait_for_timeout(2500)
    for name, route in [("today", "/"), ("tasks", "/tasks"), ("plan", "/plan"), ("goals", "/goals"), ("settings", "/settings")]:
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(1800)
        page.screenshot(path=str(OUT / f"{name}.png"))
        print("captured", name, page.url)
    browser.close()
