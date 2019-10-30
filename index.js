const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const [url, file] = process.argv.slice(2);

if (!url) {
  throw 'Please provide a URL as the first argument.';
}

function run() {
  return new Promise(async (resolve, reject) => {
    const browser = await puppeteer.launch();
    try {
      const page = await browser.newPage();
      await page.goto(url);
      await page.waitForSelector('.message-list');
      const result = await page.evaluate(() => {
        const boardTitle = document.querySelector('#board-name').textContent.trim();
        if (!boardTitle) {
          throw 'Board title does not exist. Please check if provided URL is correct.'
        }
        let parsedText = boardTitle + '\n\n';
        const columns = document.querySelectorAll('.message-list');
        columns.forEach((column) => {
          const columnTitle = column.querySelector('.column-header h2 span[role="button"]').textContent.trim();
          const messages = [...column.querySelectorAll('.message-main')].map(messageBody => {
            const messageText = messageBody.querySelector('.message-body .text').textContent.trim();
            const votes = messageBody.querySelector('.votes .vote-area span.show-vote-count').textContent.trim();
            return `- ${messageText} (${votes})`;
          });
          parsedText = parsedText + columnTitle + '\n' + messages.join('\n') + '\n\n';
        });
        return parsedText;
      });
      return resolve(result);
    } catch (e) {
      return reject(e);
    } finally {
      browser.close();
    }
  });
}

function writeToFile(filePath, data) {
  const resolvedPath = path.resolve(filePath || `../${data.split('\n')[0].replace('/', '')}.txt`);
  fs.writeFile(resolvedPath, data, (error) => {
    if (error) {
      throw error;
    } else {
      console.log(`Successfully written to file at: ${resolvedPath}`);
    }
  });
}

function handleError(error) {
  console.error(error);
  process.exit();
}

run().then((data) => writeToFile(file, data)).catch(handleError);
