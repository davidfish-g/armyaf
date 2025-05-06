import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Chip,
  IconButton,
  Collapse,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { getLogs } from '../utils/logUtils';
import { LogEntry } from '../db/database';

// Custom colors for each action type
const actionColors = {
  ITEM_ADD: '#4caf50',      // Green
  DELETE: '#f44336',        // Red
  EDIT: '#2196f3',          // Blue
  IMPORT: '#00bcd4',        // Cyan
  EXPORT: '#9c27b0',        // Purple
  PHOTO_ADD: '#ff9800',     // Orange
  PHOTO_DELETE: '#ff5722',  // Deep Orange
  FLAGGED: '#d32f2f',       // Dark Red
  UNFLAGGED: '#388e3c',     // Dark Green
  VERIFIED: '#2e7d32',      // Darker Green
  NOTES: '#795548',         // Brown
} as const;

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logs from IndexedDB
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const fetchedLogs = await getLogs(100); // Get last 100 logs
      setLogs(fetchedLogs);
      setError(null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Periodically refresh logs
  useEffect(() => {
    // Initial fetch
    fetchLogs();
    
    // Set up interval for updates
    const intervalId = setInterval(() => {
      fetchLogs();
    }, 5000); // Update every 5 seconds
    
    // Clean up interval
    return () => clearInterval(intervalId);
  }, []);
  
  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };
  
  // Get color based on action type
  const getActionColor = (action: string) => {
    return actionColors[action as keyof typeof actionColors] || '#757575'; // Default to grey if action not found
  };

  // Format action label to be more user-friendly
  const formatActionLabel = (action: string): string => {
    switch(action) {
      case 'ITEM_ADD': return 'Item Added';
      case 'DELETE': return 'Deleted';
      case 'EDIT': return 'Edited';
      case 'IMPORT': return 'Imported';
      case 'EXPORT': return 'Exported';
      case 'PHOTO_ADD': return 'Photo Added';
      case 'PHOTO_DELETE': return 'Photo Removed';
      case 'FLAGGED': return 'Flagged';
      case 'UNFLAGGED': return 'Unflagged';
      case 'VERIFIED': return 'Verified';
      case 'NOTES': return 'Notes';
      default: return action.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
  };

  // Format date without seconds
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Get summary text for the expanded view
  const getSummaryText = (log: LogEntry): React.ReactNode => {
    if (log.action === 'FLAGGED' || log.action === 'UNFLAGGED') {
      return (
        <Typography variant="body2">
          Item {log.action === 'FLAGGED' ? 'flagged' : 'unflagged'}
        </Typography>
      );
    }
    
    if (log.action === 'VERIFIED') {
      return (
        <Typography variant="body2">
          Item verified
        </Typography>
      );
    }
    
    if (log.action === 'PHOTO_ADD') {
      return <Typography variant="body2">Photo added to item</Typography>;
    }
    
    if (log.action === 'PHOTO_DELETE') {
      return <Typography variant="body2">Photo removed from item</Typography>;
    }
    
    if (log.action === 'IMPORT' && log.changes?.importedCount) {
      return (
        <Typography variant="body2">
          Imported {log.changes.importedCount} items
          {log.changes.fileName ? ` from "${log.changes.fileName}"` : ''}
        </Typography>
      );
    }
    
    if (log.action === 'DELETE' && log.changes?.deletedItemCount) {
      return (
        <Typography variant="body2">
          Deleted {log.changes.deletedItemCount} items from checklist
          {log.changes.checklistName ? ` "${log.changes.checklistName}"` : ''}
        </Typography>
      );
    }
    
    if (log.action === 'EXPORT' && log.changes?.exportedCount) {
      return (
        <Typography variant="body2">
          Exported {log.changes.exportedCount} items as {log.changes.format?.toUpperCase()} file
        </Typography>
      );
    }
    
    if (log.action === 'DELETE' && log.changes?.deletedItemFields) {
      return (
        <Typography variant="body2">
          Deleted item with fields: {Object.keys(log.changes.deletedItemFields).join(', ')}
        </Typography>
      );
    }
    
    return (
      <Typography variant="body2">
        {log.details}
      </Typography>
    );
  };

  // Render changes in a user-friendly format
  const renderChanges = (changes: Record<string, any>, action: string) => {
    // For special cases like imports, exports, deletions, we already show in summary
    if (changes.importedCount || changes.deletedItemCount || 
        changes.exportedCount || changes.deletedItemFields) {
      return null;
    }

    // For standard field changes, show a table of what changed
    const hasChangedFields = Object.keys(changes).some(key => 
      key !== 'added' && (action !== 'FLAGGED' && action !== 'UNFLAGGED' && action !== 'VERIFIED')
    );
    
    if (!hasChangedFields) {
      return null;
    }

    return (
      <Box mt={1}>
        <Table size="small">
          <TableBody>
            {Object.entries(changes).map(([key, value]) => {
              // Skip rendering some keys or complex objects
              if (key === 'added' || 
                  (action === 'FLAGGED' && key === 'isFlagged') ||
                  (action === 'UNFLAGGED' && key === 'isFlagged') ||
                  (action === 'VERIFIED' && key === 'lastVerified')) {
                return null;
              }

              if (key === 'photos') {
                const photoChange = value as { from: number, to: number };
                return (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'medium' }}>
                      Photos
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      {photoChange.to > photoChange.from 
                        ? `Added a new photo (total: ${photoChange.to})` 
                        : `Removed a photo (remaining: ${photoChange.to})`}
                    </TableCell>
                  </TableRow>
                );
              }

              if (key === 'notes') {
                const notesChange = value as { from: string | undefined, to: string | undefined };
                return (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'medium' }}>
                      Notes
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      {!notesChange.from || notesChange.from === '' 
                        ? 'Added notes' 
                        : !notesChange.to || notesChange.to === '' 
                          ? 'Removed notes' 
                          : 'Updated notes'}
                    </TableCell>
                  </TableRow>
                );
              }

              // Default rendering for other fields
              const fieldChange = value as { from: any, to: any };
              return (
                <TableRow key={key}>
                  <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'medium' }}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    {`${fieldChange.from} → ${fieldChange.to}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    );
  };
  
  if (loading && logs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress size={40} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {logs.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No activity recorded yet.
        </Typography>
      ) : (
        <List disablePadding>
          {logs.map((log, index) => (
            <ListItem 
              key={log.id || index} 
              divider
              sx={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                py: 1
              }}
            >
              <Box 
                display="flex" 
                width="100%" 
                justifyContent="space-between" 
                alignItems="center"
              >
                <Box>
                  <Chip 
                    label={formatActionLabel(log.action)} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getActionColor(log.action),
                      color: 'white',
                      '&:hover': {
                        backgroundColor: getActionColor(log.action),
                        opacity: 0.9
                      }
                    }}
                  />
                </Box>
                <Box display="flex" alignItems="center">
                  <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                    {formatDate(log.timestamp)}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => toggleExpand(index)}
                    aria-expanded={expandedItems.has(index)}
                    aria-label="show details"
                  >
                    {expandedItems.has(index) ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>
              
              <Collapse in={expandedItems.has(index)} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
                <Box sx={{ pl: 2, pr: 2, pt: 1, pb: 1, mt: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
                  {/* Show detailed changes if available */}
                  {log.changes && renderChanges(log.changes, log.action)}
                </Box>
              </Collapse>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}; 