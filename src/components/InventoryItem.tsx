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
  Divider,
} from '@mui/material';
import { PhotoCamera, Delete, Note, Edit, Flag, Add, Remove } from '@mui/icons-material';
import { InventoryItem as InventoryItemType } from '../db/database';

interface InventoryItemProps {
  item: InventoryItemType;
  onUpdate: (updatedItem: InventoryItemType, action: string) => void;
  onDelete: () => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Update the editedItem whenever the item prop changes
  React.useEffect(() => {
    setEditedItem(item);
  }, [item]);

  const handleVerify = () => {
    const updatedItem = { 
      ...item, 
      lastVerified: new Date(),
      lastUpdated: new Date()
    };
    onUpdate(updatedItem, 'VERIFIED');
  };

  const handleFlagToggle = () => {
    const updatedItem = { 
      ...item, 
      isFlagged: !item.isFlagged,
      lastUpdated: new Date()
    };
    onUpdate(updatedItem, item.isFlagged ? 'UNFLAGGED' : 'FLAGGED');
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
        onUpdate(updatedItem, 'PHOTO_CAPTURED');
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
    onUpdate(updatedItem, 'PHOTO_DELETED');
  };

  const handleSave = () => {
    onUpdate({ ...editedItem, lastUpdated: new Date() }, 'SAVED');
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    const updatedItem = {
      ...item,
      notes: editedNotes,
      lastUpdated: new Date()
    };
    onUpdate(updatedItem, 'UPDATE');
    setIsEditingNotes(false);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {item.name || 'Unnamed Item'}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              LIN: {item.lin}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              NSN: {item.nsn}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Quantity: {item.quantity}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Last Verified: {item.lastVerified ? new Date(item.lastVerified).toLocaleString() : 'Not verified'}
            </Typography>
          </Box>
          <Box>
            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handlePhotoCapture}
              />
              <IconButton
                color="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoCamera />
              </IconButton>
              <IconButton
                color="primary"
                onClick={() => setIsEditing(true)}
              >
                <Edit />
              </IconButton>
              <IconButton
                color={item.isFlagged ? "error" : "default"}
                onClick={handleFlagToggle}
              >
                <Flag />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {isEditing ? (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 1 }}>
              <TextField
                fullWidth
                label="Name"
                value={editedItem.name}
                onChange={(e) => setEditedItem(prev => ({ ...prev, name: e.target.value }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="LIN"
                value={editedItem.lin}
                onChange={(e) => setEditedItem(prev => ({ ...prev, lin: e.target.value }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="NSN"
                value={editedItem.nsn}
                onChange={(e) => setEditedItem(prev => ({ ...prev, nsn: e.target.value }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={editedItem.quantity}
                onChange={(e) => setEditedItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                margin="dense"
              />
            </Box>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={4}
              value={editedItem.notes || ''}
              onChange={(e) => setEditedItem(prev => ({ ...prev, notes: e.target.value }))}
              margin="dense"
              placeholder="Add notes about this item..."
            />
            <Box mt={1}>
              <Button variant="contained" onClick={handleSave} sx={{ mr: 1 }}>
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button
                color="error"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            {isEditingNotes ? (
              <Box mt={1} mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Notes:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  margin="dense"
                  placeholder="Add notes about this item..."
                />
              </Box>
            ) : item.notes ? (
              <Box mt={1} mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Notes:
                </Typography>
                <Typography 
                  variant="body2" 
                  color="textSecondary" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {item.notes}
                </Typography>
              </Box>
            ) : null}
            <Box mt={1}>
              <Button
                variant="contained"
                color="success"
                onClick={handleVerify}
                sx={{ mr: 1 }}
              >
                Verify
              </Button>
              <Button
                variant="outlined"
                startIcon={<Note />}
                onClick={() => {
                  if (isEditingNotes) {
                    handleSaveNotes();
                  } else {
                    setEditedNotes(item.notes || '');
                    setIsEditingNotes(true);
                  }
                }}
                sx={{ mr: 1 }}
              >
                {isEditingNotes ? 'Save Notes' : 'Notes'}
              </Button>
              <Box display="inline-flex" alignItems="center" sx={{ verticalAlign: 'middle' }}>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    const updatedItem = {
                      ...item,
                      quantity: Math.max(0, item.quantity - 1),
                      lastUpdated: new Date()
                    };
                    onUpdate(updatedItem, 'QUANTITY_UPDATED');
                  }}
                >
                  <Remove fontSize="small" />
                </IconButton>
                <Typography sx={{ px: 1, minWidth: '2ch', textAlign: 'center' }}>
                  {item.quantity}
                </Typography>
                <IconButton 
                  size="small"
                  onClick={() => {
                    const updatedItem = {
                      ...item,
                      quantity: item.quantity + 1,
                      lastUpdated: new Date()
                    };
                    onUpdate(updatedItem, 'QUANTITY_UPDATED');
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Box>
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
                      objectFit: 'cover',
                      borderRadius: 4
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: 'background.paper',
                      '&:hover': {
                        backgroundColor: 'background.paper'
                      }
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

        <Dialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Item</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this item? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={onDelete} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}; 