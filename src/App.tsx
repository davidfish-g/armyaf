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
  ToggleButton,
  Autocomplete
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { InventoryItem } from './components/InventoryItem';
import { LogViewer } from './components/LogViewer';
import { db, InventoryItem as InventoryItemType, ItemInstance, LogAction } from './db/database';
import { exportToSpreadsheet } from './utils/spreadsheetUtils';
import { Close, ArrowDropDown, History, ArrowUpward, ArrowDownward, Flag, Delete } from '@mui/icons-material';
import { logInventoryActivity, logItemUpdate } from './utils/logUtils';
import theme from './theme';
import { UI_OPTIONS, CONDITION_CODES, calculateQtyShort } from './utils/validationUtils';

type SortField = 
  | 'name' 
  | 'lin' 
  | 'nsn' 
  | 'qtyAuthorized' 
  | 'qtyOnHand' 
  | 'qtyShort' 
  | 'ui'
  | 'serialNumber'
  | 'conditionCode'
  | 'location'
  | 'lastVerified';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'flagged' | 'unverified';

interface ItemWithInstances {
  item: InventoryItemType;
  instances: ItemInstance[];
}

const StatsBox = ({ items, instancesMap }: { items: InventoryItemType[], instancesMap: Record<number, ItemInstance[]> }) => {
  const totalItems = items.length;
  
  // Calculate how many items have at least one recently verified instance
  const verifiedItems = items.filter(item => {
    if (!item.id) return false;
    const instances = instancesMap[item.id] || [];
    return instances.some(instance => {
      if (!instance.lastVerified) return false;
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return new Date(instance.lastVerified) > oneMonthAgo;
    });
  }).length;
  
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
  const [itemInstances, setItemInstances] = useState<Record<number, ItemInstance[]>>({});
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
    qtyAuthorized: 0,
    qtyOnHand: 0,
    qtyShort: 0,
    ui: '',
    notes: '',
    isFlagged: false,
    photos: []
  });
  const [newItemInstances, setNewItemInstances] = useState<Partial<ItemInstance>[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const allItems = await db.items.toArray();
      setItems(allItems);
      
      // Load instances for all items
      const instancesMap: Record<number, ItemInstance[]> = {};
      
      for (const item of allItems) {
        if (item.id) {
          const instances = await db.instances.where('parentItemId').equals(item.id).toArray();
          instancesMap[item.id] = instances;
        }
      }
      
      setItemInstances(instancesMap);
      setLoading(false);
    } catch (error) {
      console.error('Error loading items:', error);
      setLoading(false);
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
          name: updatedItem.name,
          lin: updatedItem.lin,
          nsn: updatedItem.nsn,
          qtyAuthorized: updatedItem.qtyAuthorized,
          qtyOnHand: updatedItem.qtyOnHand,
          qtyShort: updatedItem.qtyShort,
          ui: updatedItem.ui
        });
        
        // Log the update with the specific action
        if (action === 'EDIT' || action === 'PHOTO_ADD' || action === 'PHOTO_DELETE' || 
            action === 'FLAGGED' || action === 'UNFLAGGED' || action === 'VERIFIED') {
          await logItemUpdate(originalItem, updatedItem, action as any);
        } else {
          await logInventoryActivity(action as LogAction, updatedItem, {});
        }
        
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

      // Delete all instances associated with this item first
      if (itemInstances[itemId]) {
        // Delete each instance from the database
        for (const instance of itemInstances[itemId]) {
          if (instance.id) {
            await db.instances.delete(instance.id);
          }
        }
      }

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
            qtyAuthorized: itemToDelete.qtyAuthorized,
            qtyOnHand: itemToDelete.qtyOnHand,
            qtyShort: itemToDelete.qtyShort
          }
        }
      );
      
      // Update local state
      setItems(items.filter(item => item.id !== itemId));
      
      // Remove instances from state
      const updatedInstances = {...itemInstances};
      delete updatedInstances[itemId];
      setItemInstances(updatedInstances);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleInstanceAdd = async (instance: ItemInstance) => {
    try {
      // Add to database
      const id = await db.instances.add(instance);
      
      // Log the creation
      await logInventoryActivity(
        'INSTANCE_ADD',
        {},
        { 
          instanceId: id,
          parentItemId: instance.parentItemId,
          fields: instance 
        }
      );
      
      // Update local state
      const newInstance = { ...instance, id };
      setItemInstances(prev => {
        const parentId = instance.parentItemId;
        const parentInstances = prev[parentId] || [];
        return {
          ...prev,
          [parentId]: [...parentInstances, newInstance]
        };
      });
    } catch (error) {
      console.error('Error adding instance:', error);
    }
  };

  const handleInstanceUpdate = async (updatedInstance: ItemInstance, actionType: string) => {
    try {
      if (updatedInstance.id) {
        const parentId = updatedInstance.parentItemId;
        
        // Find the original instance for comparison
        const originalInstance = itemInstances[parentId]?.find(
          instance => instance.id === updatedInstance.id
        );
        
        if (!originalInstance) return;

        // Update in IndexedDB
        await db.instances.update(updatedInstance.id, updatedInstance);
        
        // Convert string action to LogAction type
        const action = actionType as LogAction;
        
        // Log the update
        await logInventoryActivity(
          action,
          {},
          { 
            instanceId: updatedInstance.id,
            parentItemId: parentId,
            changes: {
              before: originalInstance,
              after: updatedInstance
            }
          }
        );
        
        // Update local state
        setItemInstances(prev => {
          const instances = prev[parentId] || [];
          return {
            ...prev,
            [parentId]: instances.map(instance => 
              instance.id === updatedInstance.id ? updatedInstance : instance
            )
          };
        });
      }
    } catch (error) {
      console.error('Error updating instance:', error);
    }
  };

  const handleInstanceDelete = async (instanceId: number) => {
    try {
      // Find the instance
      let parentId: number | undefined;
      let instanceToDelete: ItemInstance | undefined;
      
      for (const [itemId, instances] of Object.entries(itemInstances)) {
        const instance = instances.find(i => i.id === instanceId);
        if (instance) {
          parentId = Number(itemId);
          instanceToDelete = instance;
          break;
        }
      }
      
      if (!parentId || !instanceToDelete) return;
      
      // Delete from IndexedDB
      await db.instances.delete(instanceId);
      
      // Log the deletion
      await logInventoryActivity(
        'INSTANCE_DELETE',
        {},
        { 
          instanceId: instanceId,
          parentItemId: parentId,
          deletedInstanceFields: instanceToDelete
        }
      );
      
      // Update local state
      setItemInstances(prev => {
        const instances = prev[parentId!] || [];
        return {
          ...prev,
          [parentId!]: instances.filter(instance => instance.id !== instanceId)
        };
      });
    } catch (error) {
      console.error('Error deleting instance:', error);
    }
  };

  const handleExport = async (format: 'xlsx' | 'ods' | 'csv') => {
    const blob = exportToSpreadsheet(items, format, itemInstances);
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
      // Create a complete item object
      const itemToAdd: InventoryItemType = {
        ...newItem as InventoryItemType
      };
      
      // Add to database
      const id = await db.items.add(itemToAdd);
      const itemWithId = { ...itemToAdd, id };
      
      // Log the creation
      await logInventoryActivity(
        'ITEM_ADD',
        itemWithId,
        { itemFields: itemToAdd }
      );
      
      // Update local state
      setItems([...items, itemWithId]);
      
      // Add any instances
      const newInstances: ItemInstance[] = [];
      for (const instance of newItemInstances) {
        if (instance.serialNumber && instance.conditionCode) {
          const fullInstance: ItemInstance = {
            ...instance as ItemInstance,
            parentItemId: id
          };
          
          const instanceId = await db.instances.add(fullInstance);
          newInstances.push({...fullInstance, id: instanceId});
          
          // Log instance creation
          await logInventoryActivity(
            'INSTANCE_ADD',
            {},
            { 
              instanceId,
              parentItemId: id,
              fields: fullInstance 
            }
          );
        }
      }
      
      if (newInstances.length > 0) {
        setItemInstances(prev => ({
          ...prev,
          [id]: newInstances
        }));
      }
      
      // Reset form and close dialog
      setNewItem({
        name: '',
        lin: '',
        nsn: '',
        qtyAuthorized: 0,
        qtyOnHand: 0,
        qtyShort: 0,
        ui: '',
        notes: '',
        isFlagged: false,
        photos: []
      });
      setNewItemInstances([]);
      setIsAddItemDialogOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleAddNewItemInstance = () => {
    setNewItemInstances([...newItemInstances, {
      serialNumber: '',
      location: '',
      conditionCode: ''
    }]);
  };

  const handleUpdateNewItemInstance = (index: number, field: string, value: any) => {
    const updatedInstances = [...newItemInstances];
    updatedInstances[index] = { 
      ...updatedInstances[index], 
      [field]: field === 'serialNumber' ? value.toUpperCase() : value 
    };
    setNewItemInstances(updatedInstances);
  };

  const handleRemoveNewItemInstance = (index: number) => {
    const updatedInstances = [...newItemInstances];
    updatedInstances.splice(index, 1);
    setNewItemInstances(updatedInstances);
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
          // An item is considered unverified if it has no instances or none of them have been verified recently
          if (!item.id) return true;
          const instances = itemInstances[item.id] || [];
          if (instances.length === 0) return true;
          
          return !instances.some(instance => {
            if (!instance.lastVerified) return false;
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            return new Date(instance.lastVerified) > oneMonthAgo;
          });
        default:
          return true;
      }
    });

    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      
      // Fields that are on the InventoryItem
      const itemFields = ['name', 'lin', 'nsn', 'ui', 'qtyAuthorized', 'qtyOnHand', 'qtyShort'];
      
      // Fields that are on ItemInstance
      const instanceFields = ['serialNumber', 'conditionCode', 'location', 'lastVerified'];
      
      if (itemFields.includes(sortField)) {
        // Sort by fields on the item
        if (['name', 'lin', 'nsn', 'ui'].includes(sortField)) {
          comparison = String(a[sortField as keyof InventoryItemType] || '').localeCompare(
            String(b[sortField as keyof InventoryItemType] || '')
          );
        } else {
          comparison = (a[sortField as keyof InventoryItemType] as number || 0) - 
                      (b[sortField as keyof InventoryItemType] as number || 0);
        }
      } else if (instanceFields.includes(sortField)) {
        // Sort by fields on the instance (use the first instance if it exists)
        const aInstances = a.id ? itemInstances[a.id] || [] : [];
        const bInstances = b.id ? itemInstances[b.id] || [] : [];
        
        const aValue = aInstances.length > 0 ? aInstances[0][sortField as keyof ItemInstance] : null;
        const bValue = bInstances.length > 0 ? bInstances[0][sortField as keyof ItemInstance] : null;
        
        if (sortField === 'lastVerified') {
          const aDate = aValue ? new Date(aValue as string).getTime() : 0;
          const bDate = bValue ? new Date(bValue as string).getTime() : 0;
          comparison = aDate - bDate;
        } else {
          comparison = String(aValue || '').localeCompare(String(bValue || ''));
        }
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
                        <MenuItem value="name">Nomenclature</MenuItem>
                        <MenuItem value="lin">LIN</MenuItem>
                        <MenuItem value="nsn">NSN</MenuItem>
                        <MenuItem value="qtyAuthorized">Quantity Authorized</MenuItem>
                        <MenuItem value="qtyOnHand">Quantity On Hand</MenuItem>
                        <MenuItem value="qtyShort">Quantity Short</MenuItem>
                        <MenuItem value="ui">Unit of Issue</MenuItem>
                        <MenuItem value="serialNumber">Serial Number</MenuItem>
                        <MenuItem value="conditionCode">Condition Code</MenuItem>
                        <MenuItem value="location">Location</MenuItem>
                        <MenuItem value="lastVerified">Last Verified</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton 
                      onClick={toggleSortDirection} 
                      size="small"
                      sx={{ ml: -1.5 }}
                    >
                      {sortDirection === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                    </IconButton>
                    <StatsBox items={items} instancesMap={itemInstances} />
                  </Box>
                  {getSortedItems().map(item => (
                    <InventoryItem
                      key={item.id}
                      item={item}
                      instances={item.id ? itemInstances[item.id] || [] : []}
                      onUpdate={(updatedItem, action) => handleItemUpdate(updatedItem, action)}
                      onDelete={() => item.id && handleItemDelete(item.id)}
                      onInstanceAdd={handleInstanceAdd}
                      onInstanceUpdate={handleInstanceUpdate}
                      onInstanceDelete={handleInstanceDelete}
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
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add New Item</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Item Details</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nomenclature"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="LIN"
                  value={newItem.lin}
                  onChange={(e) => setNewItem(prev => ({ ...prev, lin: e.target.value.toUpperCase() }))}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="NSN"
                  value={newItem.nsn}
                  onChange={(e) => setNewItem(prev => ({ ...prev, nsn: e.target.value }))}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={UI_OPTIONS}
                  getOptionLabel={(option) => `${option.code} - ${option.name}`}
                  value={UI_OPTIONS.find(ui => ui.code === newItem.ui) || null}
                  onChange={(_, newValue) => setNewItem(prev => ({ ...prev, ui: newValue?.code || '' }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Unit of Issue"
                      margin="dense"
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Quantity Authorized"
                  type="number"
                  value={newItem.qtyAuthorized}
                  onChange={(e) => {
                    const qtyAuthorized = Number(e.target.value);
                    setNewItem(prev => ({
                      ...prev,
                      qtyAuthorized,
                      qtyShort: calculateQtyShort(qtyAuthorized, prev.qtyOnHand || 0)
                    }));
                  }}
                  margin="dense"
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Quantity On Hand"
                  type="number"
                  value={newItem.qtyOnHand}
                  onChange={(e) => {
                    const qtyOnHand = Number(e.target.value);
                    setNewItem(prev => ({
                      ...prev,
                      qtyOnHand,
                      qtyShort: calculateQtyShort(prev.qtyAuthorized || 0, qtyOnHand)
                    }));
                  }}
                  margin="dense"
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Quantity Short"
                  type="number"
                  value={newItem.qtyShort}
                  InputProps={{ readOnly: true }}
                  margin="dense"
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
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1">Item Instances</Typography>
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={handleAddNewItemInstance}
                  >
                    Add Instance
                  </Button>
                </Box>
              </Grid>
              
              {newItemInstances.map((instance, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">Instance #{index + 1}</Typography>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveNewItemInstance(index)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Serial Number"
                          value={instance.serialNumber}
                          onChange={(e) => handleUpdateNewItemInstance(index, 'serialNumber', e.target.value)}
                          margin="dense"
                          required
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Location"
                          value={instance.location}
                          onChange={(e) => handleUpdateNewItemInstance(index, 'location', e.target.value)}
                          margin="dense"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Autocomplete
                          size="small"
                          options={CONDITION_CODES}
                          getOptionLabel={(option) => `${option.code} - ${option.description}`}
                          value={CONDITION_CODES.find(cc => cc.code === instance.conditionCode) || null}
                          onChange={(_, newValue) => handleUpdateNewItemInstance(index, 'conditionCode', newValue?.code || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Condition Code"
                              margin="dense"
                              required
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddItemDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddItem}
              variant="contained"
              disabled={!newItem.name || !newItem.lin || !newItem.nsn || !newItem.ui}
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