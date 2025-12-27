import { config } from '../config.js';

export function getVectorStoreIds(appId: string) {
  const ids: string[] = [];
  if (config.openaiVectorStoreIdCommon) {
    ids.push(config.openaiVectorStoreIdCommon);
  }

  const appMap: Record<string, string> = {
    nexus: config.openaiVectorStoreIdNexus,
    clarity: config.openaiVectorStoreIdClarity,
    mosaic: config.openaiVectorStoreIdMosaic,
  };

  const appStore = appMap[appId];
  if (appStore) {
    ids.push(appStore);
  }

  if (!ids.length && config.openaiVectorStoreId) {
    ids.push(config.openaiVectorStoreId);
  }

  return ids;
}
