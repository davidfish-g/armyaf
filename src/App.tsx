import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  ThemeProvider
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { InventoryItem } from './components/InventoryItem';
import { LogViewer } from './components/LogViewer';
import { db, InventoryItem as InventoryItemType } from './db/database';
import { exportToSpreadsheet } from './utils/spreadsheetUtils';
import { Close, ArrowDropDown, History } from '@mui/icons-material';
import { logInventoryActivity, logItemUpdate } from './utils/logUtils';
import theme from './theme';

function App() {
  const [items, setItems] = useState<InventoryItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const allItems = await db.items.toArray();
      setItems(allItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleFileUpload = async (newItems: InventoryItemType[]) => {
    setLoading(true);
    try {
      // Add items to database
      await db.items.bulkAdd(newItems);
      
      // Log the import of new items
      await logInventoryActivity(
        'CREATE',
        {},
        `Imported ${newItems.length} items`,
        { importedCount: newItems.length }
      );
      
      await loadItems();
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error('Error saving items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemUpdate = async (updatedItem: InventoryItemType) => {
    try {
      // Find the existing item before the update
      const existingItem = items.find(item => item.id === updatedItem.id);
      
      if (!existingItem) {
        console.error('Could not find item to update with id:', updatedItem.id);
        return;
      }
      
      await db.items.update(updatedItem.id!, {
        status: updatedItem.status,
        photos: updatedItem.photos,
        notes: updatedItem.notes,
        lastUpdated: updatedItem.lastUpdated,
        customFields: updatedItem.customFields
      });
      
      // Determine the type of update for logging
      let action: 'UPDATE' | 'STATUS_CHANGE' | 'PHOTO_ADD' | 'PHOTO_DELETE' = 'UPDATE';
      
      if (existingItem.status !== updatedItem.status) {
        action = 'STATUS_CHANGE';
      } else if (existingItem.photos.length < updatedItem.photos.length) {
        action = 'PHOTO_ADD';
      } else if (existingItem.photos.length > updatedItem.photos.length) {
        action = 'PHOTO_DELETE';
      }
      
      // Log the changes
      await logItemUpdate(existingItem, updatedItem, action);
      
      setItems(items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleItemDelete = async (itemId: number) => {
    try {
      // Get the item before deletion for logging
      const itemToDelete = items.find(item => item.id === itemId);
      
      if (!itemToDelete) {
        console.error('Could not find item to delete with id:', itemId);
        return;
      }
      
      await db.items.delete(itemId);
      
      // Log the deletion
      await logInventoryActivity(
        'DELETE',
        itemToDelete,
        `Deleted item`,
        { deletedItemFields: itemToDelete.customFields }
      );
      
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleExport = async (format: 'xlsx' | 'ods' | 'csv') => {
    const blob = exportToSpreadsheet(items, format);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `inventory-${new Date().toISOString().split('T')[0]}.${format}`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    // Log the export
    await logInventoryActivity(
      'EXPORT',
      {},
      `Exported ${items.length} items as ${format}`,
      { format, exportedCount: items.length }
    );
    
    setExportAnchorEl(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Army AF
            </Typography>
            <Button 
              color="inherit" 
              onClick={() => setIsUploadDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              Import
            </Button>
            <Button 
              color="inherit" 
              onClick={(e) => setExportAnchorEl(e.currentTarget)}
              disabled={items.length === 0}
              endIcon={<ArrowDropDown />}
              sx={{ mr: 1 }}
            >
              Export
            </Button>
            <IconButton 
              color="inherit" 
              onClick={() => setIsLogDrawerOpen(true)}
              aria-label="view history"
            >
              <History />
            </IconButton>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={() => setExportAnchorEl(null)}
            >
              <MenuItem onClick={() => handleExport('xlsx')}>.xlsx</MenuItem>
              <MenuItem onClick={() => handleExport('ods')}>.ods</MenuItem>
              <MenuItem onClick={() => handleExport('csv')}>.csv</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ mt: 4 }}>
          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Upload your inventory spreadsheet to get started
              </Typography>
              <FileUpload onFileUpload={handleFileUpload} />
            </Box>
          ) : (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {items.map(item => (
                    <InventoryItem
                      key={item.id}
                      item={item}
                      onUpdate={handleItemUpdate}
                      onDelete={() => item.id && handleItemDelete(item.id)}
                    />
                  ))}
                </Box>
              )}

              {/* Upload dialog */}
              <Dialog
                open={isUploadDialogOpen}
                onClose={() => setIsUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle>Import Items</DialogTitle>
                <DialogContent>
                  <FileUpload onFileUpload={handleFileUpload} />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                </DialogActions>
              </Dialog>
            </Box>
          )}
        </Container>

        {/* Activity Log Drawer */}
        <Drawer
          anchor="right"
          open={isLogDrawerOpen}
          onClose={() => setIsLogDrawerOpen(false)}
        >
          <Box sx={{ width: 350, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">History</Typography>
              <IconButton onClick={() => setIsLogDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>
            <LogViewer />
          </Box>
        </Drawer>
      </Box>
    </ThemeProvider>
  );
}

export default App; 