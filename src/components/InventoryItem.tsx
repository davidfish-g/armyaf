import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
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
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  React.useEffect(() => {
    if (isPhotoDialogOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isPhotoDialogOpen]);

  const handleStatusChange = (newStatus: 'pending' | 'verified' | 'issues') => {
    const updatedItem = { ...item, status: newStatus, lastUpdated: new Date() };
    onUpdate(updatedItem);
  };

  const handlePhotoCapture = async () => {
    if (!videoRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);

      const photoUrl = canvas.toDataURL('image/jpeg');
      const updatedItem = {
        ...item,
        photos: [...item.photos, photoUrl],
        lastUpdated: new Date()
      };
      onUpdate(updatedItem);
      setIsPhotoDialogOpen(false);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{item.name}</Typography>
          <Box>
            <Chip
              label={item.status}
              color={
                item.status === 'verified'
                  ? 'success'
                  : item.status === 'issues'
                  ? 'error'
                  : 'default'
              }
              sx={{ mr: 1 }}
            />
            <IconButton onClick={() => setIsPhotoDialogOpen(true)} sx={{ mr: 1 }}>
              <PhotoCamera />
            </IconButton>
            <IconButton onClick={() => setIsDeleteDialogOpen(true)} color="error">
              <Delete />
            </IconButton>
          </Box>
        </Box>

        {isEditing ? (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {Object.entries(editedItem.customFields || {}).map(([field, value]) => (
                <Box key={field}>
                  <TextField
                    fullWidth
                    label={field}
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomFieldChange(field, e.target.value)}
                    margin="normal"
                  />
                </Box>
              ))}
            </Box>
            <Box mt={2}>
              <Button variant="contained" onClick={handleSave} sx={{ mr: 1 }}>
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {Object.entries(item.customFields || {}).map(([field, value]) => (
                <Box key={field}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {field}: {value}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => setIsEditing(true)}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color={item.status === 'verified' ? 'success' : 'inherit'}
                onClick={() => handleStatusChange(item.status === 'verified' ? 'pending' : 'verified')}
                sx={{ mr: 1 }}
              >
                {item.status === 'verified' ? 'Mark Pending' : 'Mark Verified'}
              </Button>
              <Button
                variant="outlined"
                color={item.status === 'issues' ? 'error' : 'inherit'}
                onClick={() => handleStatusChange(item.status === 'issues' ? 'pending' : 'issues')}
              >
                {item.status === 'issues' ? 'Mark Pending' : 'Report Issues'}
              </Button>
            </Box>
          </Box>
        )}

        {item.photos.length > 0 && (
          <Box mt={2}>
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
                    onClick={() => {
                      const updatedPhotos = item.photos.filter((_, i) => i !== index);
                      onUpdate({ ...item, photos: updatedPhotos });
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>

      <Dialog 
        open={isPhotoDialogOpen} 
        onClose={() => setIsPhotoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Take Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            height: 0,
            paddingBottom: '75%', // 4:3 aspect ratio
            backgroundColor: '#000',
            overflow: 'hidden',
            borderRadius: 1,
            mb: 2
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </Box>
          <Typography variant="body2" color="textSecondary">
            Position your camera and click the capture button when ready.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPhotoDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handlePhotoCapture} 
            variant="contained"
            startIcon={<PhotoCamera />}
          >
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>

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