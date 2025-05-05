import React, { useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { parseSpreadsheet } from '../utils/spreadsheetUtils';
import { InventoryItem } from '../db/database';

interface FileUploadProps {
  onFileUpload: (items: InventoryItem[], fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      try {
        const file = acceptedFiles[0];
        const items = await parseSpreadsheet(file);
        
        // Get the original filename without extension
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        
        onFileUpload(items, fileName);
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
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
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
        Supported formats: .xlsx, .ods, .csv
      </Typography>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          open();
        }}
      >
        Select File
      </Button>
    </Box>
  );
}; 