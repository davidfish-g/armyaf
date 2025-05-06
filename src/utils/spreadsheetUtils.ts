import * as XLSX from 'xlsx';
import { InventoryItem } from '../db/database';
import { calculateQtyShort } from './validationUtils';

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
          const qtyAuthorized = Number(row['Qty Authorized']) || 0;
          const qtyOnHand = Number(row['Qty On Hand']) || 0;
          
          // Create a base item with required fields
          const item: InventoryItem = {
            isFlagged: false,
            photos: [],
            lastUpdated: new Date(),
            name: row['Nomenclature'] || row['Name'] || row['ITEM'] || row['Item'] || '',
            lin: row['LIN'] || '',
            nsn: row['NSN'] || '',
            qtyAuthorized,
            qtyOnHand,
            qtyShort: calculateQtyShort(qtyAuthorized, qtyOnHand),
            ui: row['UI'] || '',
            serialNumber: row['Serial Number'] || '',
            conditionCode: row['Condition Code'] || '',
            documentNumber: row['Document Number'] || '',
            notes: row['Notes'] || '',
            lastVerified: row['Last Verified'] ? new Date(row['Last Verified']) : undefined
          };

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

export const exportToSpreadsheet = (items: InventoryItem[], format: 'xlsx' | 'csv' | 'ods' = 'xlsx'): Blob => {
  const worksheet = XLSX.utils.json_to_sheet(
    items.map(item => ({
      'Nomenclature': item.name,
      'LIN': item.lin,
      'NSN': item.nsn,
      'Qty Authorized': item.qtyAuthorized,
      'Qty On Hand': item.qtyOnHand,
      'Qty Short': item.qtyShort,
      'UI': item.ui,
      'Serial Number': item.serialNumber,
      'Condition Code': item.conditionCode,
      'Document Number': item.documentNumber,
      'Notes': item.notes || '',
      'Flagged': item.isFlagged ? 'Yes' : 'No',
      'Last Verified': item.lastVerified ? item.lastVerified.toLocaleString() : '',
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
      : format === 'ods'
      ? 'application/vnd.oasis.opendocument.spreadsheet'
      : 'text/csv'
  });
}; 