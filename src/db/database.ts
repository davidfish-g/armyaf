import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  name: string;
  serialNumber?: string;
  status: 'pending' | 'verified' | 'issues';
  photos: string[];
  notes?: string;
  lastUpdated: Date;
  checklistId: number;
  customFields: Record<string, any>;
}

export interface Checklist {
  id?: number;
  name: string;
  createdAt: Date;
  lastModified: Date;
  items: InventoryItem[];
}

export class InventoryDatabase extends Dexie {
  checklists!: Table<Checklist>;
  items!: Table<InventoryItem>;

  constructor() {
    super('InventoryDB');
    this.version(1).stores({
      checklists: '++id, name, createdAt, lastModified',
      items: '++id, name, serialNumber, status, checklistId'
    });
  }
}

export const db = new InventoryDatabase(); 