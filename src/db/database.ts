import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  isFlagged: boolean;
  photos: string[];
  notes?: string;
  lastVerified?: Date;
  name: string;  // Will be renamed to nomenclature
  lin: string;
  nsn: string;
  ui: string;  // Unit of Issue
  qtyAuthorized: number;
  qtyOnHand: number;
  qtyShort: number;
  serialNumber: string;
  conditionCode: string;
  location: string;  // Added location field
}

export type LogAction = 
  | 'ITEM_ADD'
  | 'EDIT'
  | 'DELETE'
  | 'EXPORT'
  | 'IMPORT'
  | 'PHOTO_ADD'
  | 'PHOTO_DELETE'
  | 'FLAGGED'
  | 'UNFLAGGED'
  | 'VERIFIED'
  | 'NOTES';

export interface LogEntry {
  id?: number;
  timestamp: Date;
  action: LogAction;
  itemId?: number;
  changes?: Record<string, any>;
}

export class InventoryDatabase extends Dexie {
  items!: Table<InventoryItem>;
  logs!: Table<{
    id?: number;
    timestamp: Date;
    action: string;
    itemId?: number;
    changes?: Record<string, any>;
  }>;

  constructor() {
    super('InventoryDB');
    this.version(1).stores({
      items: '++id, name, lin, nsn, isFlagged, lastVerified',
      logs: '++id, timestamp, action, itemId'
    });
    
    // Handle schema upgrade (e.g., data migrations)
    this.on('ready', () => {
      console.log('Database is ready, current version:', this.verno);
    });
    
    this.on('versionchange', (event) => {
      console.log(`Database version changed from ${event.oldVersion} to ${event.newVersion}`);
      // Close the database to prevent other tabs from using the old version
      // and ask the user to reload the page
      this.close();
      if (typeof window !== 'undefined') {
        alert('The database has been upgraded. Please reload the page to use the new version.');
        window.location.reload();
      }
    });
  }
}

export const db = new InventoryDatabase();

// Initialize database and add migration logging
db.open().catch(err => {
  console.error('Failed to open database:', err);
}); 