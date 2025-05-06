import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  isFlagged: boolean;
  photos: string[];
  notes?: string;
  lastUpdated: Date;
  lastVerified?: Date;
  name: string;
  lin: string;
  nsn: string;
  quantity: number;
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
  details: string;
  changes?: Record<string, any>;
}

export class InventoryDatabase extends Dexie {
  items!: Table<InventoryItem>;
  logs!: Table<LogEntry>;

  constructor() {
    super('InventoryDB');
    
    // Define database schema for version 1
    this.version(1).stores({
      items: '++id, status'
    });
    
    // Upgrade to version 2: add logs table
    this.version(2).stores({
      items: '++id, status',
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