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
  Grid,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  ToggleButton
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { InventoryItem } from './components/InventoryItem';
import { LogViewer } from './components/LogViewer';
import { db, InventoryItem as InventoryItemType } from './db/database';
import { exportToSpreadsheet } from './utils/spreadsheetUtils';
import { Close, ArrowDropDown, History, ArrowUpward, ArrowDownward, Flag } from '@mui/icons-material';
import { logInventoryActivity, logItemUpdate } from './utils/logUtils';
import theme from './theme';

type SortField = 'name' | 'lin' | 'nsn' | 'quantity' | 'lastVerified' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'flagged' | 'unverified';

const StatsBox = ({ items }: { items: InventoryItemType[] }) => {
  const totalItems = items.length;
  const verifiedItems = items.filter(item => 
    item.lastVerified && new Date(item.lastVerified).getTime() > new Date().setMonth(new Date().getMonth() - 1)
  ).length;
  const flaggedItems = items.filter(item => item.isFlagged).length;
  const verifiedPercentage = totalItems > 0 ? Math.round((verifiedItems / totalItems) * 100) : 0;

  return (
    <Box
      sx={{
        minWidth: 200,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        border: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.23)',
        borderRadius: 1,
        bgcolor: 'transparent',
        ml: 'auto',
        '&:hover': {
          borderColor: 'rgba(0, 0, 0, 0.87)',
        }
      }}
    >
      <Typography variant="body2">Total: {totalItems}</Typography>
      <Typography variant="body2">Verified: {verifiedItems} ({verifiedPercentage}%)</Typography>
      <Typography variant="body2">Flagged: {flaggedItems}</Typography>
    </Box>
  );
};

function App() {
  const [items, setItems] = useState<InventoryItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
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
        'IMPORT',
        {},
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
        'ITEM_ADD',
        { ...itemToAdd, id },
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

  const handleSortFieldChange = (event: SelectChangeEvent) => {
    setSortField(event.target.value as SortField);
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getSortedItems = () => {
    const filteredItems = items.filter(item => {
      switch (filterType) {
        case 'flagged':
          return item.isFlagged;
        case 'unverified':
          return !item.lastVerified || new Date(item.lastVerified).getTime() < new Date().setMonth(new Date().getMonth() - 1);
        default:
          return true;
      }
    });

    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
        case 'lin':
        case 'nsn':
          comparison = (a[sortField] || '').localeCompare(b[sortField] || '');
          break;
        case 'quantity':
          comparison = (a[sortField] || 0) - (b[sortField] || 0);
          break;
        case 'lastVerified':
        case 'lastUpdated':
          const dateA = a[sortField] ? new Date(a[sortField]!).getTime() : 0;
          const dateB = b[sortField] ? new Date(b[sortField]!).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Show</InputLabel>
                      <Select
                        value={filterType}
                        label="Show"
                        onChange={(e) => setFilterType(e.target.value as FilterType)}
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="flagged">Flagged</MenuItem>
                        <MenuItem value="unverified">Unverified</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortField}
                        label="Sort By"
                        onChange={handleSortFieldChange}
                      >
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="lin">LIN</MenuItem>
                        <MenuItem value="nsn">NSN</MenuItem>
                        <MenuItem value="quantity">Quantity</MenuItem>
                        <MenuItem value="lastVerified">Last Verified</MenuItem>
                        <MenuItem value="lastUpdated">Last Updated</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton 
                      onClick={toggleSortDirection} 
                      size="small"
                      sx={{ ml: -1.5 }}
                    >
                      {sortDirection === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                    </IconButton>
                    <StatsBox items={items} />
                  </Box>
                  {getSortedItems().map(item => (
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
          PaperProps={{
            sx: {
              width: 350,
              height: '100%',
              overflow: 'auto'
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box sx={{ flex: 1 }} />
              <Typography variant="h6" sx={{ flex: 1 }}>History</Typography>
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