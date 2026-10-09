import { expect, Page } from 'playwright/test';
import { getSelector, justWait, waitForAnimationEnd } from '../helpers';
import testIds from '../../../src/helper/test-ids';

export const renderUserPrompt = async (page: Page, skipScreenshots?: boolean): Promise<void> => {
  await page.locator(getSelector(testIds.prompt.input)).fill('This is a user Prompt');
  await page.locator(getSelector(testIds.prompt.send)).nth(1).click();

  // The input stays disabled until the mock answer stream ends, so use retrying web-first
  // assertions instead of one-shot getAttribute() reads. Keep toHaveAttribute(): the input
  // is a div, and toBeEnabled() ignores `disabled` there, so it would pass while disabled.
  const promptInput = page.locator(getSelector(testIds.prompt.input));
  await expect(promptInput).toHaveAttribute('disabled', 'disabled');

  const userCardSelector = getSelector(testIds.chatItem.type.prompt);
  const userCard = await page.waitForSelector(userCardSelector);
  expect(userCard).toBeDefined();
  await waitForAnimationEnd(page);
  await userCard.scrollIntoViewIfNeeded();
  await expect(promptInput).not.toHaveAttribute('disabled');
  await waitForAnimationEnd(page);
  await justWait(50);

  if (skipScreenshots !== true) {
    expect(await userCard.screenshot()).toMatchSnapshot();
  }
};
