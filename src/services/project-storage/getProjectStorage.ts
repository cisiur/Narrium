import { BrowserProjectStorage } from './BrowserProjectStorage';
import type { ProjectStorage } from './ProjectStorage';

const browserProjectStorage = new BrowserProjectStorage();

export function getProjectStorage(): ProjectStorage {
  return browserProjectStorage;
}
