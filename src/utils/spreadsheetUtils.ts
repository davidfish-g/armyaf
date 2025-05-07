import * as XLSX from 'xlsx';
import { InventoryItem, ItemInstance } from '../db/database';
import { calculateQtyShort } from './validationUtils';

// Field name mappings for import
const FIELD_MAPPINGS = {
  nsn: [
    'NSN', 'Stock Number', 'National Stock Number', 'NSN #', 'Item NSN'
  ],
  lin: [
    'LIN', 'Line Item Number', 'Line #', 'LIN Code', 'Item LIN', 'Line Number'
  ],
  name: [
    'Nomenclature', 'Item Description', 'Description', 'Item Name', 'End Item Name',
    'Nomenclature/Description', 'Equipment Description', 'Item desc'
  ],
  ui: [
    'UI', 'Unit of Issue', 'Issue Unit', 'U/I', 'Qty Unit', 'Distribution Unit'
  ],
  qtyAuthorized: [
    'Qty Authorized', 'Authorized Qty', 'Authorized Quantity', 'Allowance',
    'Required Quantity', 'QTY AUTH', 'Qty Req'
  ],
  qtyOnHand: [
    'Qty On Hand', 'On Hand', 'OH Qty', 'Current Qty', 'Actual Count',
    'QTY OH', 'Present Qty'
  ],
  qtyShort: [
    'Qty Short', 'Shortage', 'QTY SHORT', 'Difference', 'Qty Deficit',
    'Missing Qty', 'Shortfall'
  ],
  serialNumber: [
    'Serial Number', 'SN', 'S/N', 'Ser No', 'Serial No.', 'Serial'
  ],
  location: [
    'Location', 'Sub-Hand Receipt Holder', 'SHR Holder', 'Custodian',
    'Holder', 'Assigned To', 'Room', 'Building', 'Responsible Party',
    'Storage Location'
  ],
  conditionCode: [
    'Condition Code', 'Cond Code', 'Cond', 'Status', 'Serviceability',
    'Condition', 'Equipment Status'
  ],
  lastVerified: [
    'Date Acquired', 'Date Verified', 'Last Verified', 'Inventory Date',
    'Acquisition Date', 'Date of Inventory', 'Verification Date',
    'Last Checked', 'Date Entered'
  ],
  isFlagged: [
    'Flagged', 'Is Flagged', 'Flag', 'Marked', 'Highlight', 'Attention',
    'Needs Attention', 'Issue', 'Problem', 'Concern'
  ]
};

// Helper function to find the value for a field using its possible column names
const findFieldValue = (row: any, fieldNames: string[]): any => {
  // Create a case-insensitive map of the row's keys
  const rowKeysMap = new Map(
    Object.keys(row).map(key => [key.toLowerCase(), key])
  );

  // Check each possible field name (case-insensitive)
  for (const name of fieldNames) {
    const lowerName = name.toLowerCase();
    if (rowKeysMap.has(lowerName)) {
      // Use the original case key from the row
      return row[rowKeysMap.get(lowerName)!];
    }
  }
  return undefined;
};

// Helper function to convert various flag values to boolean
const parseFlagValue = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return ['yes', 'true', 'y', '1', 'flagged', 'mark', 'highlight'].includes(lowerValue);
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

// Define the structure for parseSpreadsheet results
interface ImportResult {
  items: InventoryItem[];
  instances: Map<number, ItemInstance[]>;
}

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
          const qtyAuthorized = Number(findFieldValue(row, FIELD_MAPPINGS.qtyAuthorized)) || 0;
          const qtyOnHand = Number(findFieldValue(row, FIELD_MAPPINGS.qtyOnHand)) || 0;
          
          // Create item with only the fields from InventoryItem interface
          const item: InventoryItem = {
            isFlagged: parseFlagValue(findFieldValue(row, FIELD_MAPPINGS.isFlagged)),
            photos: [],
            name: findFieldValue(row, FIELD_MAPPINGS.name) || '',
            lin: findFieldValue(row, FIELD_MAPPINGS.lin) || '',
            nsn: findFieldValue(row, FIELD_MAPPINGS.nsn) || '',
            qtyAuthorized,
            qtyOnHand,
            qtyShort: calculateQtyShort(qtyAuthorized, qtyOnHand),
            ui: findFieldValue(row, FIELD_MAPPINGS.ui) || '',
            notes: row['Notes'] || ''
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

export const exportToSpreadsheet = (
  items: InventoryItem[], 
  format: 'xlsx' | 'csv' | 'ods' = 'xlsx',
  itemInstances?: Record<number, ItemInstance[]>
): Blob => {
  // Transform the data for export
  const exportData = items.map(item => {
    // Get the first instance if available (for backward compatibility)
    const instances = itemInstances && item.id ? itemInstances[item.id] || [] : [];
    const firstInstance = instances.length > 0 ? instances[0] : null;
    
    return {
      // Item properties
      'Nomenclature': item.name,
      'LIN': item.lin,
      'NSN': item.nsn,
      'Qty Authorized': item.qtyAuthorized,
      'Qty On Hand': item.qtyOnHand,
      'Qty Short': item.qtyShort,
      'UI': item.ui,
      'Notes': item.notes || '',
      'Flagged': item.isFlagged ? 'Yes' : 'No',
      
      // Instance properties (if available)
      'Serial Number': firstInstance?.serialNumber || '',
      'Condition Code': firstInstance?.conditionCode || '',
      'Location': firstInstance?.location || '',
      'Last Verified': firstInstance?.lastVerified ? 
        new Date(firstInstance.lastVerified).toLocaleString() : ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);

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