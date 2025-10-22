import { NexusSDK } from '@avail-project/nexus-core';
import type { NexusNetwork } from '@avail-project/nexus-core';

let nexusInstance: NexusSDK | null = null;

export const createNexusSDK = (network: NexusNetwork = 'testnet'): NexusSDK => {
  if (!nexusInstance) {
    nexusInstance = new NexusSDK({ network });
  }
  return nexusInstance;
};

export const getNexusSDK = (): NexusSDK | null => {
  return nexusInstance;
};

export const initializeNexus = async (provider: any): Promise<void> => {
  if (!nexusInstance) {
    nexusInstance = new NexusSDK({ network: 'testnet' });
  }
  await nexusInstance.initialize(provider);
};

export const isNexusInitialized = (): boolean => {
  return nexusInstance?.isInitialized() || false;
};

export const deinitializeNexus = (): void => {
  nexusInstance = null;
};
