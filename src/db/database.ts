import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
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

export type LogAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'PHOTO_ADD'
  | 'PHOTO_DELETE'
  | 'STATUS_CHANGE';

export interface LogEntry {
  id?: number;
  timestamp: Date;
  action: LogAction;
  itemId?: number;
  checklistId?: number;
  details: string;
  changes?: Record<string, any>;
}

export class InventoryDatabase extends Dexie {
  checklists!: Table<Checklist>;
  items!: Table<InventoryItem>;
  logs!: Table<LogEntry>;

  constructor() {
    super('InventoryDB');
    
    // Define database schema for version 1
    this.version(1).stores({
      checklists: '++id, name, createdAt, lastModified',
      items:      '++id, status, checklistId'
    });
    
    // Upgrade to version 2: add logs table
    this.version(2).stores({
      checklists: '++id, name, createdAt, lastModified',
      items:      '++id, status, checklistId',
      logs:       '++id, timestamp, action, itemId, checklistId'
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