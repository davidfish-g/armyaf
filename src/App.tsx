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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { InventoryItem } from './components/InventoryItem';
import { LogViewer } from './components/LogViewer';
import { db, InventoryItem as InventoryItemType, Checklist } from './db/database';
import { exportToSpreadsheet } from './utils/spreadsheetUtils';
import { Close, ArrowDropDown, History } from '@mui/icons-material';
import { logInventoryActivity, logItemUpdate } from './utils/logUtils';

function App() {
  const [items, setItems] = useState<InventoryItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [activeChecklistId, setActiveChecklistId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<number | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  useEffect(() => {
    loadChecklists();
  }, []);

  useEffect(() => {
    if (activeChecklistId) {
      loadItemsForChecklist(activeChecklistId);
    }
  }, [activeChecklistId]);

  const loadChecklists = async () => {
    try {
      const lists = await db.checklists.toArray();
      setChecklists(lists);
      
      // Select the first checklist if available and none is selected
      if (lists.length > 0 && !activeChecklistId) {
        setActiveChecklistId(lists[0].id!);
      }
    } catch (error) {
      console.error('Error loading checklists:', error);
    }
  };

  const loadItemsForChecklist = async (checklistId: number) => {
    try {
      const checklistItems = await db.items
        .where('checklistId')
        .equals(checklistId)
        .toArray();
      setItems(checklistItems);
    } catch (error) {
      console.error('Error loading items for checklist:', error);
    }
  };

  const loadItems = async () => {
    try {
      if (activeChecklistId) {
        await loadItemsForChecklist(activeChecklistId);
      } else {
        const allItems = await db.items.toArray();
        setItems(allItems);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleFileUpload = async (newItems: InventoryItemType[], fileName?: string) => {
    setLoading(true);
    try {
      // Use the uploaded file's name as the base name for the sheet
      const baseChecklistName = fileName?.trim() || "Inventory";
      let checklistName = baseChecklistName;
      // Count sheets with the same base name
      const existingSheets = await db.checklists.toArray();
      const similarSheets = existingSheets.filter(sheet => 
        sheet.name === baseChecklistName || sheet.name.startsWith(`${baseChecklistName} (`)
      );
      // If we already have sheets with the same base name, add a number
      if (similarSheets.length > 0) {
        checklistName = `${baseChecklistName} (${similarSheets.length})`;
      }
      const checklistId = await db.checklists.add({
        name: checklistName,
        createdAt: new Date(),
        lastModified: new Date(),
        items: []
      });
      // Add items with the checklist ID
      const itemsWithChecklist = newItems.map(item => ({
        ...item,
        checklistId
      }));
      await db.items.bulkAdd(itemsWithChecklist);
      
      // Log the import of new items
      await logInventoryActivity(
        'CREATE',
        { checklistId },
        `Imported ${itemsWithChecklist.length} items to checklist "${checklistName}"`,
        { importedCount: itemsWithChecklist.length, fileName }
      );
      
      await loadChecklists();
      setActiveChecklistId(checklistId);
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
        checklistId: updatedItem.checklistId,
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
        `Deleted item from checklist`,
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
    const checklist = checklists.find(c => c.id === activeChecklistId);
    await logInventoryActivity(
      'EXPORT',
      { checklistId: activeChecklistId || undefined },
      `Exported ${items.length} items as ${format}`,
      { format, checklistName: checklist?.name, exportedCount: items.length }
    );
    
    setExportAnchorEl(null);
  };

  const handleChangeChecklist = (event: React.SyntheticEvent, newValue: number) => {
    setActiveChecklistId(newValue);
  };

  const openDeleteDialog = (checklistId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setChecklistToDelete(checklistId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteChecklist = async () => {
    if (!checklistToDelete) return;
    
    try {
      // Find the checklist before deletion for logging
      const checklistToBeDeleted = checklists.find(c => c.id === checklistToDelete);
      
      // Delete all items associated with this checklist
      const itemsToDelete = await db.items
        .where('checklistId')
        .equals(checklistToDelete)
        .toArray();
      
      await db.items
        .where('checklistId')
        .equals(checklistToDelete)
        .delete();
      
      // Delete the checklist itself
      await db.checklists.delete(checklistToDelete);
      
      // Log the deletion of the checklist and its items
      await logInventoryActivity(
        'DELETE',
        { checklistId: checklistToDelete },
        `Deleted checklist "${checklistToBeDeleted?.name}" with ${itemsToDelete.length} items`,
        { 
          checklistName: checklistToBeDeleted?.name,
          deletedItemCount: itemsToDelete.length
        }
      );
      
      // Update state
      const updatedChecklists = checklists.filter(list => list.id !== checklistToDelete);
      setChecklists(updatedChecklists);
      
      // If we deleted the active checklist, select another one
      if (activeChecklistId === checklistToDelete) {
        if (updatedChecklists.length > 0) {
          setActiveChecklistId(updatedChecklists[0].id!);
        } else {
          setActiveChecklistId(null);
          setItems([]);
        }
      }
      
      setDeleteDialogOpen(false);
      setChecklistToDelete(null);
    } catch (error) {
      console.error('Error deleting checklist:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Army AF
          </Typography>
          {checklists.length > 0 && (
            <>
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
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {checklists.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Upload your inventory spreadsheet to get started
            </Typography>
            <FileUpload onFileUpload={handleFileUpload} />
          </Box>
        ) : (
          <Box>
            {/* Sheet tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeChecklistId} 
                onChange={handleChangeChecklist}
                variant="scrollable"
                scrollButtons="auto"
              >
                {checklists.map(checklist => (
                  <Tab 
                    key={checklist.id} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {checklist.name}
                        <IconButton 
                          size="small"
                          onClick={(e) => openDeleteDialog(checklist.id!, e)}
                          sx={{ ml: 1 }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    value={checklist.id} 
                  />
                ))}
              </Tabs>
            </Box>

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

            {/* New sheet upload dialog */}
            <Dialog
              open={isUploadDialogOpen}
              onClose={() => setIsUploadDialogOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Import New Sheet</DialogTitle>
              <DialogContent>
                <FileUpload onFileUpload={handleFileUpload} />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
              </DialogActions>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog
              open={deleteDialogOpen}
              onClose={() => setDeleteDialogOpen(false)}
            >
              <DialogTitle>Delete Sheet</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to delete this sheet? This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleDeleteChecklist} color="error">Delete</Button>
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
  );
}

export default App; 