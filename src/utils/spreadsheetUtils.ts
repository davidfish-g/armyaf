import * as XLSX from 'xlsx';
import { InventoryItem } from '../db/database';

export const parseSpreadsheet = (file: File): Promise<InventoryItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const items: InventoryItem[] = jsonData.map((row: any) => {
          // Create a base item with required fields
          const item: InventoryItem = {
            name: row.name || row.Name || row.ITEM || row.Item || '',
            status: 'pending',
            photos: [],
            lastUpdated: new Date(),
            checklistId: 0, // This will be set when creating the checklist
            // Store all other fields from the spreadsheet in a customFields object
            customFields: {}
          };

          // Add all other columns from the spreadsheet as custom fields
          Object.keys(row).forEach(key => {
            if (!['name', 'Name', 'ITEM', 'Item'].includes(key)) {
              item.customFields[key] = row[key];
            }
          });

          return item;
        });

        resolve(items);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const exportToSpreadsheet = (items: InventoryItem[], format: 'xlsx' | 'csv' = 'xlsx'): Blob => {
  const worksheet = XLSX.utils.json_to_sheet(
    items.map(item => ({
      'Name': item.name,
      ...item.customFields,
      'Status': item.status,
      'Last Updated': item.lastUpdated.toLocaleString()
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  
  const excelBuffer = XLSX.write(workbook, { 
    bookType: format,
    type: 'array'
  });
  
  return new Blob([excelBuffer], { 
    type: format === 'xlsx' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv'
  });
}; 