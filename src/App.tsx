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
  ThemeProvider,
  TextField,
  Grid
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
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItemType>>({
    name: '',
    lin: '',
    nsn: '',
    quantity: 1,
    notes: '',
    isFlagged: false,
    photos: [],
    lastUpdated: new Date()
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const allItems = await db.items.toArray();
      console.log('Loaded items:', allItems); // Debug log
      setItems(allItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleFileUpload = async (newItems: InventoryItemType[]) => {
    setLoading(true);
    try {
      console.log('Uploading items:', newItems); // Debug log
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

  const handleItemUpdate = async (updatedItem: InventoryItemType, action: string) => {
    try {
      if (updatedItem.id) {
        // Get the original item for comparison
        const originalItem = items.find(item => item.id === updatedItem.id);
        if (!originalItem) return;

        // Update in IndexedDB
        await db.items.update(updatedItem.id, {
          isFlagged: updatedItem.isFlagged,
          photos: updatedItem.photos,
          notes: updatedItem.notes,
          lastUpdated: updatedItem.lastUpdated,
          name: updatedItem.name,
          lin: updatedItem.lin,
          nsn: updatedItem.nsn,
          quantity: updatedItem.quantity,
          lastVerified: updatedItem.lastVerified
        });
        
        // Log the update with the specific action
        await logItemUpdate(originalItem, updatedItem, action as any);
        
        // Update local state
        setItems(items.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleItemDelete = async (itemId: number) => {
    try {
      const itemToDelete = items.find(item => item.id === itemId);
      if (!itemToDelete) return;

      // Delete from IndexedDB
      await db.items.delete(itemId);
      
      // Log the deletion
      await logInventoryActivity(
        'DELETE',
        itemToDelete,
        `Deleted item`,
        { 
          deletedItemFields: {
            name: itemToDelete.name,
            lin: itemToDelete.lin,
            nsn: itemToDelete.nsn,
            quantity: itemToDelete.quantity
          }
        }
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

  const handleAddItem = async () => {
    try {
      const itemToAdd: InventoryItemType = {
        ...newItem as InventoryItemType,
        lastUpdated: new Date()
      };
      
      // Add to database
      const id = await db.items.add(itemToAdd);
      
      // Log the creation
      await logInventoryActivity(
        'CREATE',
        { ...itemToAdd, id },
        `Added new item: ${itemToAdd.name}`,
        { itemFields: itemToAdd }
      );
      
      // Update local state
      setItems([...items, { ...itemToAdd, id }]);
      
      // Reset form and close dialog
      setNewItem({
        name: '',
        lin: '',
        nsn: '',
        quantity: 1,
        notes: '',
        isFlagged: false,
        photos: [],
        lastUpdated: new Date()
      });
      setIsAddItemDialogOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
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
              onClick={() => setIsAddItemDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              Add Item
            </Button>
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
                      onUpdate={(updatedItem, action) => handleItemUpdate(updatedItem, action)}
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

        {/* Add Item Dialog */}
        <Dialog
          open={isAddItemDialogOpen}
          onClose={() => setIsAddItemDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add New Item</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="LIN"
                  value={newItem.lin}
                  onChange={(e) => setNewItem(prev => ({ ...prev, lin: e.target.value }))}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="NSN"
                  value={newItem.nsn}
                  onChange={(e) => setNewItem(prev => ({ ...prev, nsn: e.target.value }))}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  margin="dense"
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={newItem.notes}
                  onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                  margin="dense"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddItemDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddItem}
              variant="contained"
              disabled={!newItem.name || !newItem.lin || !newItem.nsn}
            >
              Add Item
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App; 