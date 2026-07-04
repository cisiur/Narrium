import { describe, expect, it, vi } from 'vitest';
import { createDesktopCloseRequestHandler } from './DesktopPlatformService';

describe('createDesktopCloseRequestHandler', () => {
  it('prevents the first native close immediately and asks Tauri to close after approval', async () => {
    const event = { preventDefault: vi.fn() };
    const closeWindow = vi.fn(() => Promise.resolve());
    const handleCloseRequest = createDesktopCloseRequestHandler(
      () => Promise.resolve(true),
      closeWindow,
    );

    await handleCloseRequest(event);

    expect(event.preventDefault.mock.invocationCallOrder[0]).toBeLessThan(
      closeWindow.mock.invocationCallOrder[0],
    );
    expect(closeWindow).toHaveBeenCalled();
  });

  it('prevents the native close and keeps the window open when blocked', async () => {
    const event = { preventDefault: vi.fn() };
    const closeWindow = vi.fn(() => Promise.resolve());
    const handleCloseRequest = createDesktopCloseRequestHandler(
      () => Promise.resolve(false),
      closeWindow,
    );

    await handleCloseRequest(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
  });

  it('allows the programmatic close request through without another prompt', async () => {
    const closeWindow = vi.fn(() => Promise.resolve());
    const confirmClose = vi.fn(() => Promise.resolve(true));
    const handleCloseRequest = createDesktopCloseRequestHandler(confirmClose, closeWindow);
    const firstEvent = { preventDefault: vi.fn() };
    const secondEvent = { preventDefault: vi.fn() };

    await handleCloseRequest(firstEvent);
    await handleCloseRequest(secondEvent);

    expect(firstEvent.preventDefault).toHaveBeenCalled();
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
    expect(confirmClose).toHaveBeenCalledTimes(1);
  });
});
