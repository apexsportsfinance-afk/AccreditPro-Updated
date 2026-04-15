import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    console.log("Navigating to Scanner...");
    try {
        await page.goto('http://localhost:5173/scanner', { waitUntil: 'networkidle0', timeout: 10000 });
        console.log("Navigation complete. Clicking Activate Camera button...");
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const activateBtn = btns.find(b => b.textContent && b.textContent.includes('Activate Camera'));
            if(activateBtn) activateBtn.click();
            else console.log("Could not find button");
        });
        await new Promise(r => setTimeout(r, 3000));
        console.log("Done waiting after click.");
    } catch (e) {
        console.log("Nav failed:", e.message);
    }
    await browser.close();
})();
