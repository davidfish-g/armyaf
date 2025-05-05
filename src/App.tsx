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
  IconButton
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { InventoryItem } from './components/InventoryItem';
import { db, InventoryItem as InventoryItemType } from './db/database';
import { exportToSpreadsheet } from './utils/spreadsheetUtils';
import { MoreVert } from '@mui/icons-material';

function App() {
  const [items, setItems] = useState<InventoryItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

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
      // Create a new checklist
      const checklistId = await db.checklists.add({
        name: `Inventory ${new Date().toLocaleString()}`,
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
      await loadItems();
    } catch (error) {
      console.error('Error saving items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemUpdate = async (updatedItem: InventoryItemType) => {
    try {
      await db.items.update(updatedItem.id!, {
        name: updatedItem.name,
        serialNumber: updatedItem.serialNumber,
        status: updatedItem.status,
        photos: updatedItem.photos,
        notes: updatedItem.notes,
        lastUpdated: updatedItem.lastUpdated,
        checklistId: updatedItem.checklistId,
        customFields: updatedItem.customFields
      });
      setItems(items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleItemDelete = async (itemId: number) => {
    try {
      await db.items.delete(itemId);
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const blob = exportToSpreadsheet(items, format);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    setExportAnchorEl(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Military Inventory Management
          </Typography>
          {items.length > 0 && (
            <>
              <IconButton
                color="inherit"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => setExportAnchorEl(e.currentTarget)}
              >
                <MoreVert />
              </IconButton>
              <Menu
                anchorEl={exportAnchorEl}
                open={Boolean(exportAnchorEl)}
                onClose={() => setExportAnchorEl(null)}
              >
                <MenuItem onClick={() => handleExport('xlsx')}>Export as Excel</MenuItem>
                <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Welcome to Military Inventory Management
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Upload your inventory spreadsheet to get started
            </Typography>
            <FileUpload onFileUpload={handleFileUpload} />
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 4 }}>
              <FileUpload onFileUpload={handleFileUpload} />
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
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default App; 