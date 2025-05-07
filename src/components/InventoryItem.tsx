import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { 
  Delete, 
  Note, 
  Edit, 
  Flag, 
  Add, 
  Remove, 
  CheckCircle,
  Warning 
} from '@mui/icons-material';
import { InventoryItem as InventoryItemType, ItemInstance, db } from '../db/database';
import { 
  validateNSN, 
  validateLIN, 
  formatLIN, 
  validateSerialNumber, 
  formatSerialNumber, 
  UI_OPTIONS,
  CONDITION_CODES,
  calculateQtyShort
} from '../utils/validationUtils';

interface InventoryItemProps {
  item: InventoryItemType;
  instances: ItemInstance[];
  onUpdate: (updatedItem: InventoryItemType, action: string) => void;
  onDelete: () => void;
  onInstanceAdd: (instance: ItemInstance) => void;
  onInstanceUpdate: (instance: ItemInstance, action: string) => void;
  onInstanceDelete: (instanceId: number) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ 
  item, 
  instances, 
  onUpdate, 
  onDelete, 
  onInstanceAdd,
  onInstanceUpdate,
  onInstanceDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddInstanceDialogOpen, setIsAddInstanceDialogOpen] = useState(false);
  const [instanceToEdit, setInstanceToEdit] = useState<ItemInstance | null>(null);
  const [newInstance, setNewInstance] = useState<Partial<ItemInstance>>({
    parentItemId: item.id || 0,
    serialNumber: '',
    location: '',
    conditionCode: ''
  });

  // Update the editedItem whenever the item prop changes
  useEffect(() => {
    setEditedItem(item);
  }, [item]);

  // Function to check if instance was verified within the last month
  const isInstanceVerifiedRecently = (instance: ItemInstance) => {
    if (!instance.lastVerified) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(instance.lastVerified) > oneMonthAgo;
  };

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'nsn':
        return validateNSN(value) ? null : 'Invalid NSN format (e.g., 1005-01-123-4567)';
      case 'lin':
        return validateLIN(value) ? null : 'LIN must be 1-6 alphanumeric characters';
      case 'serialNumber':
        return validateSerialNumber(value) ? null : 'Invalid serial number format';
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

  const handleInstanceFieldChange = (field: string, value: any) => {
    let formattedValue = value;
    
    // Format values as needed
    if (field === 'serialNumber') {
      formattedValue = formatSerialNumber(value);
    }

    // Validate the field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    if (instanceToEdit) {
      setInstanceToEdit(prev => {
        if (!prev) return null;
        return { ...prev, [field]: formattedValue };
      });
    } else {
      setNewInstance(prev => ({ ...prev, [field]: formattedValue }));
    }
  };

  const handleVerifyInstance = (instance: ItemInstance) => {
    const updatedInstance = { 
      ...instance, 
      lastVerified: new Date() 
    };
    onInstanceUpdate(updatedInstance, 'VERIFIED');
  };

  const handleFlagToggle = () => {
    const updatedItem = { 
      ...item, 
      isFlagged: !item.isFlagged
    };
    onUpdate(updatedItem, item.isFlagged ? 'UNFLAGGED' : 'FLAGGED');
  };

  const handleSave = () => {
    // Check for any validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) return;

    const updatedItem = {
      ...item,
      ...editedItem
    };
    onUpdate(updatedItem, 'EDIT');
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    const updatedItem = {
      ...item,
      notes: editedNotes
    };
    onUpdate(updatedItem, 'Notes');
    setIsEditingNotes(false);
  };

  const handleAddInstance = () => {
    // Check for any validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) return;

    const instance: ItemInstance = {
      ...newInstance as ItemInstance,
      parentItemId: item.id || 0
    };
    
    onInstanceAdd(instance);
    
    // Reset form
    setNewInstance({
      parentItemId: item.id || 0,
      serialNumber: '',
      location: '',
      conditionCode: ''
    });
    setIsAddInstanceDialogOpen(false);
  };

  const handleSaveInstance = () => {
    // Check for any validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors || !instanceToEdit) return;

    onInstanceUpdate(instanceToEdit, 'INSTANCE_EDIT');
    setInstanceToEdit(null);
  };

  const handleDeleteInstance = (instanceId: number) => {
    onInstanceDelete(instanceId);
  };

  const getInstanceVerificationStatus = (instance: ItemInstance) => {
    if (!instance.lastVerified) {
      return <Chip icon={<Warning />} color="warning" label="Not Verified" size="small" />;
    }
    
    const lastVerified = new Date(instance.lastVerified);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));
    
    let timeAgo = '';
    if (diffInDays === 0) {
      const diffInHours = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60));
      timeAgo = diffInHours === 0 ? 'Just now' : `${diffInHours}h ago`;
    } else if (diffInDays < 30) {
      timeAgo = `${diffInDays}d ago`;
    } else {
      const diffInMonths = Math.floor(diffInDays / 30);
      timeAgo = `${diffInMonths}m ago`;
    }
    
    return <Chip 
      icon={<CheckCircle />} 
      color={diffInDays < 30 ? "success" : "warning"} 
      label={timeAgo} 
      size="small" 
    />;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {item.name}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              LIN: {item.lin} | NSN: {item.nsn} | UI: {item.ui}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Qty Authorized: {item.qtyAuthorized} | Qty On Hand: {item.qtyOnHand} | Qty Short: {item.qtyShort}
            </Typography>
          </Box>

          <Box>
            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
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
            <Box mt={1} mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">Item Instances</Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<Add />}
                  onClick={() => setIsAddInstanceDialogOpen(true)}
                  sx={{ 
                    textTransform: 'none',
                    color: 'text.secondary !important',
                    borderColor: 'text.secondary !important',
                    '& .MuiSvgIcon-root': {
                      color: 'text.secondary !important'
                    },
                    '&:hover': {
                      borderColor: 'text.primary !important',
                      color: 'text.primary !important',
                      backgroundColor: 'action.hover',
                      '& .MuiSvgIcon-root': {
                        color: 'text.primary !important'
                      }
                    }
                  }}
                >
                  Add Instance
                </Button>
              </Box>
              
              {instances.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Serial Number</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Condition Code</TableCell>
                        <TableCell>Last Verified</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {instances.map((instance) => (
                        <TableRow key={instance.id}>
                          <TableCell>{instance.serialNumber}</TableCell>
                          <TableCell>{instance.location}</TableCell>
                          <TableCell>{instance.conditionCode}</TableCell>
                          <TableCell>{getInstanceVerificationStatus(instance)}</TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small"
                              onClick={() => handleVerifyInstance(instance)}
                              disabled={isInstanceVerifiedRecently(instance)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => setInstanceToEdit(instance)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => instance.id && handleDeleteInstance(instance.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box 
                  p={2} 
                  textAlign="center" 
                  sx={{ 
                    border: '1px dashed', 
                    borderColor: 'grey.300',
                    borderRadius: 1 
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    No instances added yet. Click "Add Instance" to add serial numbers, locations, etc.
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box mt={1}>
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
                  sx={{ 
                    mr: 1,
                    textTransform: 'none'
                  }}
                >
                  {isEditingNotes ? 'Save notes' : 'Notes'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Add Instance Dialog */}
        <Dialog
          open={isAddInstanceDialogOpen}
          onClose={() => setIsAddInstanceDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Item Instance</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Serial Number"
              value={newInstance.serialNumber}
              onChange={(e) => handleInstanceFieldChange('serialNumber', e.target.value)}
              margin="dense"
              required
              error={!!errors.serialNumber}
              helperText={errors.serialNumber}
            />
            <TextField
              fullWidth
              label="Location"
              value={newInstance.location}
              onChange={(e) => handleInstanceFieldChange('location', e.target.value)}
              margin="dense"
              placeholder="Enter location"
            />
            <Autocomplete
              options={CONDITION_CODES}
              getOptionLabel={(option) => `${option.code} - ${option.description}`}
              value={CONDITION_CODES.find(cc => cc.code === newInstance.conditionCode) || null}
              onChange={(_, newValue) => handleInstanceFieldChange('conditionCode', newValue?.code || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Condition Code"
                  margin="dense"
                  required
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddInstanceDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddInstance}
              variant="contained"
              disabled={!newInstance.serialNumber || !newInstance.conditionCode}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Instance Dialog */}
        <Dialog
          open={!!instanceToEdit}
          onClose={() => setInstanceToEdit(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Item Instance</DialogTitle>
          <DialogContent>
            {instanceToEdit && (
              <>
                <TextField
                  fullWidth
                  label="Serial Number"
                  value={instanceToEdit.serialNumber}
                  onChange={(e) => handleInstanceFieldChange('serialNumber', e.target.value)}
                  margin="dense"
                  required
                  error={!!errors.serialNumber}
                  helperText={errors.serialNumber}
                />
                <TextField
                  fullWidth
                  label="Location"
                  value={instanceToEdit.location}
                  onChange={(e) => handleInstanceFieldChange('location', e.target.value)}
                  margin="dense"
                  placeholder="Enter location"
                />
                <Autocomplete
                  options={CONDITION_CODES}
                  getOptionLabel={(option) => `${option.code} - ${option.description}`}
                  value={CONDITION_CODES.find(cc => cc.code === instanceToEdit.conditionCode) || null}
                  onChange={(_, newValue) => handleInstanceFieldChange('conditionCode', newValue?.code || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Condition Code"
                      margin="dense"
                      required
                    />
                  )}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInstanceToEdit(null)}>Cancel</Button>
            <Button 
              onClick={handleSaveInstance}
              variant="contained"
              disabled={!instanceToEdit?.serialNumber || !instanceToEdit?.conditionCode}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Item Dialog */}
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