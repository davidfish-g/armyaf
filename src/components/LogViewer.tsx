import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { getLogs } from '../utils/logUtils';
import { LogEntry } from '../db/database';

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
    switch(action) {
      case 'CREATE': return 'success';
      case 'DELETE': return 'error';
      case 'UPDATE': return 'primary';
      case 'STATUS_CHANGE': return 'warning';
      case 'PHOTO_ADD': 
      case 'PHOTO_DELETE': return 'info';
      case 'EXPORT': return 'secondary';
      default: return 'default';
    }
  };

  // Format action label to be more user-friendly
  const formatActionLabel = (action: string): string => {
    switch(action) {
      case 'CREATE': return 'Created';
      case 'DELETE': return 'Deleted';
      case 'UPDATE': return 'Updated';
      case 'STATUS_CHANGE': return 'Status Changed';
      case 'PHOTO_ADD': return 'Photo Added';
      case 'PHOTO_DELETE': return 'Photo Removed';
      case 'EXPORT': return 'Exported';
      default: return action;
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
    
    if (log.action === 'CREATE' && log.changes?.importedCount) {
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
        <Typography variant="subtitle2" gutterBottom>
          Changed Fields
        </Typography>
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
                const photoChange = value as { old: number, new: number, added?: boolean };
                return (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'medium' }}>
                      Photos
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      {photoChange.added 
                        ? `Added a new photo (total: ${photoChange.new})` 
                        : `Removed a photo (remaining: ${photoChange.new})`}
                    </TableCell>
                  </TableRow>
                );
              }

              if (key === 'notes') {
                const notesChange = value as { old: string | undefined, new: string | undefined };
                return (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'medium' }}>
                      Notes
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      {notesChange.old === undefined || notesChange.old === '' 
                        ? 'Added notes' 
                        : notesChange.new === undefined || notesChange.new === '' 
                          ? 'Removed notes' 
                          : 'Updated notes'}
                    </TableCell>
                  </TableRow>
                );
              }

              // Default rendering for other fields
              return (
                <TableRow key={key}>
                  <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'medium' }}>
                    {key}
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    {typeof value === 'object' 
                      ? JSON.stringify(value) 
                      : value.toString()}
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
        <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
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
                      color={getActionColor(log.action) as any}
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
                    {/* First show a summary of what changed */}
                    {getSummaryText(log)}
                    
                    {/* Then show detailed changes if available */}
                    {log.changes && renderChanges(log.changes, log.action)}
                  </Box>
                </Collapse>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}; 