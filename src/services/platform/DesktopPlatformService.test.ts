import { describe, expect, it, vi } from 'vitest';
import { handleDesktopCloseRequest } from './DesktopPlatformService';

describe('handleDesktopCloseRequest', () => {
  it('prevents the native close immediately and closes after clean approval', async () => {
    const event = { preventDefault: vi.fn() };
    const closeWindow = vi.fn(() => Promise.resolve());

    await handleDesktopCloseRequest(event, () => Promise.resolve(true), closeWindow);

    expect(event.preventDefault.mock.invocationCallOrder[0]).toBeLessThan(
      closeWindow.mock.invocationCallOrder[0],
    );
    expect(closeWindow).toHaveBeenCalled();
  });

  it('prevents the native close and keeps the window open when blocked', async () => {
    const event = { preventDefault: vi.fn() };
    const closeWindow = vi.fn(() => Promise.resolve());

    await handleDesktopCloseRequest(event, () => Promise.resolve(false), closeWindow);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
  });
});
