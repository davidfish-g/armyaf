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
  Autocomplete,
  FormHelperText,
} from '@mui/material';
import { PhotoCamera, Delete, Note, Edit, Flag, Add, Remove } from '@mui/icons-material';
import { InventoryItem as InventoryItemType } from '../db/database';
import { 
  validateNSN, 
  validateLIN, 
  formatLIN, 
  validateSerialNumber, 
  formatSerialNumber, 
  validateDocumentNumber,
  UI_OPTIONS,
  CONDITION_CODES,
  calculateQtyShort
} from '../utils/validationUtils';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Function to check if item was verified within the last month
  const isVerifiedWithinLastMonth = () => {
    if (!item.lastVerified) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(item.lastVerified) > oneMonthAgo;
  };

  // Update the editedItem whenever the item prop changes
  React.useEffect(() => {
    setEditedItem(item);
  }, [item]);

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'nsn':
        return validateNSN(value) ? null : 'Invalid NSN format (e.g., 1005-01-123-4567)';
      case 'lin':
        return validateLIN(value) ? null : 'LIN must be 1-6 alphanumeric characters';
      case 'serialNumber':
        return validateSerialNumber(value) ? null : 'Invalid serial number format';
      case 'documentNumber':
        return validateDocumentNumber(value) ? null : 'Invalid document number format';
      case 'qtyAuthorized':
      case 'qtyOnHand':
        return value >= 0 ? null : 'Quantity must be 0 or greater';
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    let formattedValue = value;
    
    // Format values as needed
    if (field === 'lin') {
      formattedValue = formatLIN(value);
    } else if (field === 'serialNumber') {
      formattedValue = formatSerialNumber(value);
    }

    // Validate the field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    // Update the edited item
    setEditedItem(prev => {
      const updated = { ...prev, [field]: formattedValue };
      
      // Calculate qtyShort if either qtyAuthorized or qtyOnHand changes
      if (field === 'qtyAuthorized' || field === 'qtyOnHand') {
        updated.qtyShort = calculateQtyShort(
          field === 'qtyAuthorized' ? formattedValue : updated.qtyAuthorized,
          field === 'qtyOnHand' ? formattedValue : updated.qtyOnHand
        );
      }
      
      return updated;
    });
  };

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
    // Check for any validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) return;

    const updatedItem = {
      ...item,
      ...editedItem,
      lastUpdated: new Date()
    };
    onUpdate(updatedItem, 'EDIT');
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    const updatedItem = {
      ...item,
      notes: editedNotes,
      lastUpdated: new Date()
    };
    onUpdate(updatedItem, 'NOTES');
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
              <strong>LIN:</strong> {item.lin}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>NSN:</strong> {item.nsn}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Qty Authorized:</strong> {item.qtyAuthorized}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Qty On Hand:</strong> {item.qtyOnHand}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Qty Short:</strong> {item.qtyShort}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>UI:</strong> {item.ui}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Serial Number:</strong> {item.serialNumber}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Condition Code:</strong> {item.conditionCode}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Document Number:</strong> {item.documentNumber}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Last Verified:</strong> {item.lastVerified ? new Date(item.lastVerified).toLocaleDateString() : 'Not verified'}
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
                label="Nomenclature"
                value={editedItem.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                margin="dense"
                required
              />
              <TextField
                fullWidth
                label="LIN"
                value={editedItem.lin}
                onChange={(e) => handleFieldChange('lin', e.target.value)}
                margin="dense"
                required
                error={!!errors.lin}
                helperText={errors.lin}
              />
              <TextField
                fullWidth
                label="NSN"
                value={editedItem.nsn}
                onChange={(e) => handleFieldChange('nsn', e.target.value)}
                margin="dense"
                required
                error={!!errors.nsn}
                helperText={errors.nsn}
              />
              <Autocomplete
                options={UI_OPTIONS}
                getOptionLabel={(option) => `${option.code} - ${option.name}`}
                value={UI_OPTIONS.find(ui => ui.code === editedItem.ui) || null}
                onChange={(_, newValue) => handleFieldChange('ui', newValue?.code || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Unit of Issue"
                    margin="dense"
                    required
                  />
                )}
              />
              <TextField
                fullWidth
                label="Quantity Authorized"
                type="number"
                value={editedItem.qtyAuthorized}
                onChange={(e) => handleFieldChange('qtyAuthorized', Number(e.target.value))}
                margin="dense"
                required
                inputProps={{ min: 0 }}
                error={!!errors.qtyAuthorized}
                helperText={errors.qtyAuthorized}
              />
              <TextField
                fullWidth
                label="Quantity On Hand"
                type="number"
                value={editedItem.qtyOnHand}
                onChange={(e) => handleFieldChange('qtyOnHand', Number(e.target.value))}
                margin="dense"
                required
                inputProps={{ min: 0 }}
                error={!!errors.qtyOnHand}
                helperText={errors.qtyOnHand}
              />
              <TextField
                fullWidth
                label="Serial Number"
                value={editedItem.serialNumber}
                onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                margin="dense"
                error={!!errors.serialNumber}
                helperText={errors.serialNumber}
              />
              <Autocomplete
                options={CONDITION_CODES}
                getOptionLabel={(option) => `${option.code} - ${option.description}`}
                value={CONDITION_CODES.find(cc => cc.code === editedItem.conditionCode) || null}
                onChange={(_, newValue) => handleFieldChange('conditionCode', newValue?.code || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Condition Code"
                    margin="dense"
                    required
                  />
                )}
              />
              <TextField
                fullWidth
                label="Document Number"
                value={editedItem.documentNumber}
                onChange={(e) => handleFieldChange('documentNumber', e.target.value)}
                margin="dense"
                error={!!errors.documentNumber}
                helperText={errors.documentNumber}
              />
              <TextField
                fullWidth
                label="Last Verified"
                type="date"
                value={editedItem.lastVerified ? new Date(editedItem.lastVerified).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange('lastVerified', new Date(e.target.value))}
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
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
                  <strong>Notes:</strong> {item.notes}
                </Typography>
              </Box>
            ) : null}
            <Box mt={1}>
              <Button
                variant={isVerifiedWithinLastMonth() ? "contained" : "outlined"}
                color="success"
                onClick={handleVerify}
                sx={{ mr: 1 }}
              >
                {isVerifiedWithinLastMonth() ? "Verified" : "Verify"}
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