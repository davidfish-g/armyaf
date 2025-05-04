import React, { useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { parseSpreadsheet } from '../utils/spreadsheetUtils';
import { InventoryItem } from '../db/database';

interface FileUploadProps {
  onFileUpload: (items: InventoryItem[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      try {
        const items = await parseSpreadsheet(acceptedFiles[0]);
        onFileUpload(items);
      } catch (error) {
        console.error('Error parsing spreadsheet:', error);
        // TODO: Add error handling UI
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed #ccc',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'action.hover'
        }
      }}
    >
      <input {...getInputProps()} />
      <Typography variant="h6" gutterBottom>
        {isDragActive
          ? 'Drop the spreadsheet here'
          : 'Drag and drop a spreadsheet, or click to select'}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Supported formats: .xlsx, .csv
      </Typography>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
      >
        Select File
      </Button>
    </Box>
  );
}; 