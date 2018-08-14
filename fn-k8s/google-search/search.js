const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function example() {
  let driver = await new Builder().forBrowser('chrome')
    .setChromeOptions(
      new chrome.Options().addArguments(['--headless','--no-sandbox','--disable-dev-shm-usage'])
    ).build();
  try {
    await driver.get('http://www.google.com/ncr');
    (await driver.findElement(By.name('q'))).sendKeys('webdriver', Key.RETURN);
    await driver.wait(until.titleIs('webdriver - Google Search'), 1000);
    const results$$ = await driver.findElements(By.css('.srg > .g'));
    for (let result$ of results$$) {
      console.log({
        title: await result$.findElement(By.css('h3')).getText(),
        description: await result$.findElement(By.css('.st')).getText()
      });
    }
  } finally {
    await driver.quit();
  }
};

example().then(() => {
  console.log('done!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
