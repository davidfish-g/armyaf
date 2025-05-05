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
    checklistId: item.checklistId,
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
 * Helper to log item updates with changes detection
 */
export const logItemUpdate = async (
  oldItem: InventoryItem,
  newItem: InventoryItem,
  action: LogAction = 'UPDATE'
): Promise<void> => {
  // Calculate what changed
  const changes: Record<string, any> = {};
  
  // Check status changes
  if (oldItem.status !== newItem.status) {
    changes.status = { old: oldItem.status, new: newItem.status };
  }
  
  // Check notes changes
  if (oldItem.notes !== newItem.notes) {
    changes.notes = { old: oldItem.notes, new: newItem.notes };
  }
  
  // Check custom fields changes
  const oldFields = oldItem.customFields || {};
  const newFields = newItem.customFields || {};
  
  // All unique keys from both old and new
  const allKeys = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);
  
  allKeys.forEach(key => {
    if (JSON.stringify(oldFields[key]) !== JSON.stringify(newFields[key])) {
      changes[`customField.${key}`] = { old: oldFields[key], new: newFields[key] };
    }
  });
  
  // Check photo changes
  if (oldItem.photos.length !== newItem.photos.length) {
    changes.photos = { 
      old: oldItem.photos.length, 
      new: newItem.photos.length,
      added: newItem.photos.length > oldItem.photos.length
    };
  }
  
  // Log if there were any changes
  if (Object.keys(changes).length > 0) {
    let details = 'Item updated';
    
    // Add more specific details if it's a specific type of update
    if (action === 'STATUS_CHANGE') {
      details = `Status changed from ${oldItem.status} to ${newItem.status}`;
    } else if (action === 'PHOTO_ADD') {
      details = 'Photo added to item';
    } else if (action === 'PHOTO_DELETE') {
      details = 'Photo removed from item';
    }
    
    await logInventoryActivity(action, newItem, details, changes);
  }
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