import { Builder, Browser } from 'selenium-webdriver'

async function pruebaSelenium() {
  const driver = await new Builder()
    .forBrowser(Browser.EDGE)
    .build()

  try {
    await driver.get('http://localhost:5173')

    console.log('Título:', await driver.getTitle())
    console.log('URL:', await driver.getCurrentUrl())

  } finally {
    await driver.quit()
  }
}

pruebaSelenium()