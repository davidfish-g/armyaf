import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';
import { InventoryItem as InventoryItemType } from '../db/database';

interface InventoryItemProps {
  item: InventoryItemType;
  onUpdate: (updatedItem: InventoryItemType) => void;
  onDelete: () => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Update the editedItem whenever the item prop changes
  React.useEffect(() => {
    setEditedItem(item);
  }, [item]);

  const handleStatusChange = (newStatus: 'pending' | 'verified' | 'issues') => {
    const updatedItem = { ...item, status: newStatus, lastUpdated: new Date() };
    onUpdate(updatedItem);
  };

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoUrl = e.target?.result as string;
        const updatedItem = {
          ...item,
          photos: [...item.photos, photoUrl],
          lastUpdated: new Date()
        };
        // We set a special action identifier by updating the onUpdate
        onUpdate(updatedItem);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleDeletePhoto = (index: number) => {
    const updatedPhotos = item.photos.filter((_, i) => i !== index);
    const updatedItem = { 
      ...item, 
      photos: updatedPhotos,
      lastUpdated: new Date() 
    };
    onUpdate(updatedItem);
  };

  const handleSave = () => {
    onUpdate({ ...editedItem, lastUpdated: new Date() });
    setIsEditing(false);
  };

  const handleCustomFieldChange = (field: string, value: any) => {
    setEditedItem(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [field]: value
      }
    }));
  };

  const handleDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          {/* Name removed: no longer present in item */}
          <Box>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handlePhotoCapture}
            />
            <IconButton onClick={() => fileInputRef.current?.click()} sx={{ mr: 1 }}>
              <PhotoCamera />
            </IconButton>
            {isEditing && (
              <IconButton onClick={() => setIsDeleteDialogOpen(true)} color="error">
                <Delete />
              </IconButton>
            )}
          </Box>
        </Box>

        {isEditing ? (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 1 }}>
              {Object.entries(editedItem.customFields || {}).map(([field, value]) => (
                <Box key={field}>
                  <TextField
                    fullWidth
                    label={field}
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomFieldChange(field, e.target.value)}
                    margin="dense"
                  />
                </Box>
              ))}
            </Box>
            <Box mt={1}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={editedItem.notes || ''}
                onChange={(e) => setEditedItem(prev => ({ ...prev, notes: e.target.value }))}
                margin="dense"
              />
            </Box>
            <Box mt={1}>
              <Button variant="contained" onClick={handleSave} sx={{ mr: 1 }}>
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 1 }}>
              {Object.entries(item.customFields || {}).map(([field, value]) => (
                <Box key={field}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {field}: {value}
                  </Typography>
                </Box>
              ))}
            </Box>
            {item.notes && (
              <Box mt={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Notes:
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {item.notes}
                </Typography>
              </Box>
            )}
            <Box mt={1}>
              <Button
                variant="outlined"
                onClick={() => setIsEditing(true)}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
              <Button
                variant={item.status === 'pending' ? 'contained' : 'outlined'}
                color="inherit"
                onClick={() => handleStatusChange('pending')}
                sx={{ mr: 1 }}
              >
                Pending
              </Button>
              <Button
                variant={item.status === 'verified' ? 'contained' : 'outlined'}
                color="success"
                onClick={() => handleStatusChange('verified')}
                sx={{ mr: 1 }}
              >
                Verified
              </Button>
              <Button
                variant={item.status === 'issues' ? 'contained' : 'outlined'}
                color="error"
                onClick={() => handleStatusChange('issues')}
              >
                Issues
              </Button>
            </Box>
          </Box>
        )}

        {item.photos.length > 0 && (
          <Box mt={1}>
            <Typography variant="subtitle2" gutterBottom>
              Photos:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {item.photos.map((photo, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: 100,
                    height: 100
                  }}
                >
                  <img
                    src={photo}
                    alt={`Item ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }}
                    onClick={() => handleDeletePhoto(index)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary">
            Are you sure you want to delete this item? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}; 