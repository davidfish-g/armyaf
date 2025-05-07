import { InventoryItem, db, LogAction, LogEntry } from '../db/database';

// No longer need to define types here as they're in the database.ts file
// Also no longer need the in-memory logs array

/**
 * Log a new entry for inventory activity
 */
export const logInventoryActivity = async (
  action: LogAction,
  item: Partial<InventoryItem>,
  changes?: Record<string, any>
): Promise<number> => {
  const logEntry: LogEntry = {
    timestamp: new Date(),
    action,
    itemId: item.id,
    changes
  };
  
  // Log to console for debugging
  console.log(`[LOG] ${logEntry.action}`, logEntry);
  
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
  
  // lastVerified is now on ItemInstance, not on InventoryItem
  // Verification is now tracked per instance
  
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

  if (oldItem.qtyAuthorized !== newItem.qtyAuthorized) {
    changes.qtyAuthorized = {
      from: oldItem.qtyAuthorized,
      to: newItem.qtyAuthorized
    };
  }

  if (oldItem.qtyOnHand !== newItem.qtyOnHand) {
    changes.qtyOnHand = {
      from: oldItem.qtyOnHand,
      to: newItem.qtyOnHand
    };
  }

  if (oldItem.qtyShort !== newItem.qtyShort) {
    changes.qtyShort = {
      from: oldItem.qtyShort,
      to: newItem.qtyShort
    };
  }

  // If no changes were detected, don't log anything
  if (Object.keys(changes).length === 0) {
    return -1;
  }
  
  return logInventoryActivity(
    action,
    newItem,
    changes
  );
};

/**
 * Get all log entries (could add filtering options in the future)
 */
export const getLogs = async (limit = 100): Promise<LogEntry[]> => {
  try {
    const logs = await db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
    return logs.map(log => ({
      ...log,
      action: log.action as LogAction
    }));
  } catch (error) {
    console.error('Error fetching logs from IndexedDB:', error);
    return [];
  }
}; 