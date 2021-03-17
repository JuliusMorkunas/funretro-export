const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [url, file] = process.argv.slice(2);

if (!url) {
  throw 'Please provide a URL as the first argument.';
}

let boardTitle = '';

const getInnerText = (node) => node.innerText.trim();

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector('.easy-board');
  await page.waitForSelector('.board-name');

  boardTitle = await page.$eval('.board-name', getInnerText);

  if (!boardTitle) {
    throw 'Board title does not exist. Please check if provided URL is correct.';
  }

  let parsedText = `# ${boardTitle}\n\n`;

  const columns = await page.$$('.easy-card-list');

  for (let i = 0; i < columns.length; i++) {
    const columnTitle = await columns[i].$eval(
      '.column-header > h2',
      getInnerText,
    );

    const messages = await columns[i].$$('.column > li');
    if (messages.length) {
      parsedText += `## ${columnTitle}\n`;
    }
    for (let i = 0; i < messages.length; i++) {
      const messageText = await messages[i].$eval(
        '.easy-card-body .text',
        getInnerText,
      );

      const votesCount = await messages[
        i
        ].$eval('.easy-card-votes-container span.easy-badge-votes', (node) =>
        node.innerText.trim(),
      );
      const votesCountText = votesCount > 0 ? `(+${votesCount})` : '';
      parsedText += `- ${messageText} ${votesCountText}\n`;

      let commentsCount = 0;
      try {
        commentsCount =
          await messages[i].$eval('[aria-label="New comment"] .easy-badge-votes', getInnerText);
      } catch {
        // TODO: Review comments selector
      }
      if (Number(commentsCount) > 0) {
        await messages[i].$eval('[aria-label="New comment"]', (node) =>
          node.click(),
        );
        const comments = await messages[i].$$('.comment');
        if (comments.length) {
          for (let i = 0; i < comments.length; i++) {
            const commentText = await comments[i].$eval(
              '.comment .text',
              getInnerText,
            );
            parsedText += `\t- ${commentText}\n`;
          }
        }
      }
    }

    if (messages.length) {
      parsedText += '\n';
    }
  }

  return parsedText;
}

function writeToFile(filePath, data) {
  const datetime = new Date();
  const resolvedPath = path.resolve(
    filePath ||
    `../${boardTitle.replace('/', '')} - ${datetime
      .toISOString()
      .slice(0, 10)}.txt`,
  );
  fs.writeFile(resolvedPath, data, (error) => {
    if (error) {
      throw error;
    } else {
      console.info(`Successfully written to file at: ${resolvedPath}`);
    }
    process.exit();
  });
}

function handleError(error) {
  console.error(error);
}

run()
  .then((data) => writeToFile(file, data))
  .catch(handleError);
