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
  // If details weren't provided, generate them based on the action
  if (!details) {
    switch (action) {
      case 'ITEM_ADD':
        details = `Added new item: "${item.name}"`;
        break;
      case 'DELETE':
        details = `Deleted item: "${item.name}"`;
        break;
      case 'IMPORT':
        details = `Imported ${changes?.importedCount || 0} items`;
        break;
      case 'EXPORT':
        details = `Exported ${changes?.exportedCount || 0} items as ${changes?.format?.toUpperCase() || 'file'}`;
        break;
      default:
        details = `Updated item`;
    }
  }

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
  let details = '';
  
  // Track flag changes
  if (oldItem.isFlagged !== newItem.isFlagged) {
    changes.isFlagged = {
      from: oldItem.isFlagged,
      to: newItem.isFlagged
    };
    details = `${newItem.isFlagged ? 'Flagged' : 'Unflagged'} "${newItem.name}"`;
  }
  
  // Track last verified changes
  if (oldItem.lastVerified?.getTime() !== newItem.lastVerified?.getTime()) {
    changes.lastVerified = {
      from: oldItem.lastVerified,
      to: newItem.lastVerified
    };
    details = `Verified "${newItem.name}"`;
  }
  
  // Track photo changes
  if (oldItem.photos.length !== newItem.photos.length) {
    changes.photos = {
      from: oldItem.photos.length,
      to: newItem.photos.length
    };
    details = `${newItem.photos.length > oldItem.photos.length ? 'Added photo to' : 'Removed photo from'} "${newItem.name}"`;
  }
  
  // Track notes changes
  if (oldItem.notes !== newItem.notes) {
    changes.notes = {
      from: oldItem.notes,
      to: newItem.notes
    };
    details = `Updated notes for "${newItem.name}"`;
  }

  // Track hard-coded field changes
  if (oldItem.name !== newItem.name) {
    changes.name = {
      from: oldItem.name,
      to: newItem.name
    };
    details = `Changed name from "${oldItem.name}" to "${newItem.name}"`;
  }

  if (oldItem.lin !== newItem.lin) {
    changes.lin = {
      from: oldItem.lin,
      to: newItem.lin
    };
    details = `Changed LIN of "${newItem.name}" from "${oldItem.lin}" to "${newItem.lin}"`;
  }

  if (oldItem.nsn !== newItem.nsn) {
    changes.nsn = {
      from: oldItem.nsn,
      to: newItem.nsn
    };
    details = `Changed NSN of "${newItem.name}" from "${oldItem.nsn}" to "${newItem.nsn}"`;
  }

  if (oldItem.quantity !== newItem.quantity) {
    changes.quantity = {
      from: oldItem.quantity,
      to: newItem.quantity
    };
    details = `Changed quantity of "${newItem.name}" from ${oldItem.quantity} to ${newItem.quantity}`;
  }

  // If no specific changes were detected but it's an edit action, provide a generic message
  if (!details && action === 'EDIT') {
    details = `Updated "${newItem.name}"`;
  }
  
  return logInventoryActivity(
    action,
    newItem,
    details,
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