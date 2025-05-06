import { InventoryItem, db, LogAction, LogEntry } from '../db/database';

// No longer need to define types here as they're in the database.ts file
// Also no longer need the in-memory logs array

/**
 * Log a new entry for inventory activity
 */
export const logInventoryActivity = async (
  action: LogAction,
  item: Partial<InventoryItem>,
  details: string,
  changes?: Record<string, any>
): Promise<number> => {
  const logEntry: LogEntry = {
    timestamp: new Date(),
    action,
    itemId: item.id,
    details,
    changes
  };
  
  // Log to console for debugging
  console.log(`[LOG] ${logEntry.action}: ${logEntry.details}`, logEntry);
  
  // Store in IndexedDB
  try {
    const id = await db.logs.add(logEntry);
    return id;
  } catch (error) {
    console.error('Error saving log to IndexedDB:', error);
    return -1;
  }
};

/**
 * Log an item update with detailed changes
 */
export const logItemUpdate = async (
  oldItem: InventoryItem,
  newItem: InventoryItem,
  action: 'EDIT' | 'PHOTO_ADD' | 'PHOTO_DELETE' | 'FLAGGED' | 'UNFLAGGED' | 'VERIFIED'
): Promise<number> => {
  const changes: Record<string, any> = {};
  
  // Track flag changes
  if (oldItem.isFlagged !== newItem.isFlagged) {
    changes.isFlagged = {
      from: oldItem.isFlagged,
      to: newItem.isFlagged
    };
  }
  
  // Track last verified changes
  if (oldItem.lastVerified?.getTime() !== newItem.lastVerified?.getTime()) {
    changes.lastVerified = {
      from: oldItem.lastVerified,
      to: newItem.lastVerified
    };
  }
  
  // Track photo changes
  if (oldItem.photos.length !== newItem.photos.length) {
    changes.photos = {
      from: oldItem.photos.length,
      to: newItem.photos.length
    };
  }
  
  // Track notes changes
  if (oldItem.notes !== newItem.notes) {
    changes.notes = {
      from: oldItem.notes,
      to: newItem.notes
    };
  }

  // Track hard-coded field changes
  if (oldItem.name !== newItem.name) {
    changes.name = {
      from: oldItem.name,
      to: newItem.name
    };
  }

  if (oldItem.lin !== newItem.lin) {
    changes.lin = {
      from: oldItem.lin,
      to: newItem.lin
    };
  }

  if (oldItem.nsn !== newItem.nsn) {
    changes.nsn = {
      from: oldItem.nsn,
      to: newItem.nsn
    };
  }

  if (oldItem.quantity !== newItem.quantity) {
    changes.quantity = {
      from: oldItem.quantity,
      to: newItem.quantity
    };
  }
  
  return logInventoryActivity(
    action,
    newItem,
    `Updated item`,
    changes
  );
};

/**
 * Get all log entries (could add filtering options in the future)
 */
export const getLogs = async (limit = 100): Promise<LogEntry[]> => {
  try {
    return await db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
  } catch (error) {
    console.error('Error fetching logs from IndexedDB:', error);
    return [];
  }
}; 