// NSN validation: 13-digit numeric code (e.g., 1005-01-123-4567)
export const validateNSN = (nsn: string): boolean => {
  const nsnRegex = /^\d{4}-\d{2}-\d{3}-\d{4}$/;
  return nsnRegex.test(nsn);
};

// LIN validation: max 6 characters, alphanumeric only
export const validateLIN = (lin: string): boolean => {
  const linRegex = /^[A-Za-z0-9]{1,6}$/;
  return linRegex.test(lin);
};

// Format LIN to uppercase
export const formatLIN = (lin: string): string => {
  return lin.toUpperCase();
};

// Serial number validation: 5-20 characters, uppercase letters, digits, and specific special characters
export const validateSerialNumber = (serial: string): boolean => {
  const serialRegex = /^[A-Z0-9\-/\.]{5,20}$/;
  return serialRegex.test(serial);
};

// Format serial number to uppercase
export const formatSerialNumber = (serial: string): string => {
  return serial.toUpperCase();
};

// Document number validation: 14-character alphanumeric (DODAAC + Julian Date + Serial)
export const validateDocumentNumber = (doc: string): boolean => {
  const docRegex = /^[A-Z0-9]{6}\d{4}[A-Z0-9]{4}$/;
  return docRegex.test(doc);
};

// Unit of Issue options
export const UI_OPTIONS = [
  { code: 'AM', name: 'AMPOULE' },
  { code: 'AT', name: 'ASSORTMENT' },
  { code: 'AY', name: 'ASSEMBLY' },
  { code: 'BA', name: 'BALL' },
  { code: 'BD', name: 'BUNDLE' },
  { code: 'BE', name: 'BALE' },
  { code: 'BF', name: 'BOARD FOOT' },
  { code: 'BG', name: 'BAG' },
  { code: 'BK', name: 'BOOK' },
  { code: 'BL', name: 'BARREL' },
  { code: 'BO', name: 'BOLT' },
  { code: 'BR', name: 'BAR' },
  { code: 'BT', name: 'BOTTLE' },
  { code: 'BX', name: 'BOX' },
  { code: 'CA', name: 'CARTRIDGE' },
  { code: 'CB', name: 'CARBOY' },
  { code: 'CD', name: 'CUBIC YARD' },
  { code: 'CE', name: 'CONE' },
  { code: 'CF', name: 'CUBIC FOOT' },
  { code: 'CK', name: 'CAKE' },
  { code: 'CL', name: 'COIL' },
  { code: 'CM', name: 'CENTIMETER' },
  { code: 'CN', name: 'CAN' },
  { code: 'CO', name: 'CONTAINER' },
  { code: 'CS', name: 'CASE' },
  { code: 'CT', name: 'CARTON' },
  { code: 'CU', name: 'CUBE' },
  { code: 'CY', name: 'CYLINDER' },
  { code: 'CZ', name: 'CUBIC METER' },
  { code: 'DR', name: 'DRUM' },
  { code: 'DZ', name: 'DOZEN' },
  { code: 'EA', name: 'EACH' },
  { code: 'EN', name: 'ENVELOPE' },
  { code: 'FT', name: 'FOOT' },
  { code: 'FV', name: 'FIVE' },
  { code: 'FY', name: 'FIFTY' },
  { code: 'GL', name: 'GALLON' },
  { code: 'GP', name: 'GROUP' },
  { code: 'GR', name: 'GROSS' },
  { code: 'HD', name: 'HUNDRED (100)' },
  { code: 'HK', name: 'HANK' },
  { code: 'IN', name: 'INCH' },
  { code: 'JR', name: 'JAR' },
  { code: 'KG', name: 'KILOGRAM' },
  { code: 'KT', name: 'KIT' },
  { code: 'LB', name: 'POUND' },
  { code: 'LG', name: 'LENGTH' },
  { code: 'LI', name: 'LITER' },
  { code: 'LT', name: 'LOT' },
  { code: 'MC', name: 'THOUSAND CUBIC FEET' },
  { code: 'ME', name: 'MEAL' },
  { code: 'MM', name: 'MILLIMETER' },
  { code: 'MR', name: 'METER' },
  { code: 'MX', name: 'THOUSAND (1000)' },
  { code: 'OT', name: 'OUTFIT' },
  { code: 'OZ', name: 'OUNCE' },
  { code: 'PD', name: 'PAD' },
  { code: 'PG', name: 'PACKAGE' },
  { code: 'PK', name: 'PACKAGE BUY' },
  { code: 'PM', name: 'PLATE' },
  { code: 'PR', name: 'PAIR' },
  { code: 'PT', name: 'PINT' },
  { code: 'PZ', name: 'PACKET' },
  { code: 'QT', name: 'QUART' },
  { code: 'RA', name: 'RATION' },
  { code: 'RL', name: 'REEL' },
  { code: 'RM', name: 'REAM (500 SHEETS)' },
  { code: 'RO', name: 'ROLL' },
  { code: 'SD', name: 'SKID' },
  { code: 'SE', name: 'SET' },
  { code: 'SF', name: 'SQUARE FOOT' },
  { code: 'SH', name: 'SHEET' },
  { code: 'SK', name: 'SKIEN' },
  { code: 'SL', name: 'SPOOL' },
  { code: 'SO', name: 'SHOT' },
  { code: 'SP', name: 'STRIP' },
  { code: 'SV', name: 'SERVICE' },
  { code: 'SX', name: 'STICK' },
  { code: 'SY', name: 'SQUARE YARD' },
  { code: 'TD', name: 'TWENTY-FOUR' },
  { code: 'TE', name: 'TEN' },
  { code: 'TF', name: 'TWENTY-FIVE' },
  { code: 'TN', name: 'TON' },
  { code: 'TO', name: 'TROY OUNCE' },
  { code: 'TS', name: 'THIRTY-SIX' },
  { code: 'TU', name: 'TUBE' },
  { code: 'VI', name: 'VIAL' },
  { code: 'XX', name: 'DOLLARS FOR SERVICES' },
  { code: 'YD', name: 'YARD' }
];

// Condition Code options
export const CONDITION_CODES = [
  { code: 'A', description: 'SERVICEABLE (ISSUABLE WITHOUT QUALIFICATION)' },
  { code: 'B', description: 'SERVICEABLE (ISSUABLE WITH QUALIFICATION)' },
  { code: 'C', description: 'SERVICEABLE (PRIORITY ISSUE)' },
  { code: 'D', description: 'SERVICEABLE (TEST/ MODIFICATION)' },
  { code: 'E', description: 'UNSERVICEABLE (LIMITED RESTORATION)' },
  { code: 'F', description: 'UNSERVICEABLE (REPARABLE)' },
  { code: 'G', description: 'UNSERVICEABLE (INCOMPLETE)' },
  { code: 'H', description: 'UNSERVICEABLE (CONDEMNED)' },
  { code: 'J', description: 'SUSPENDED (IN STOCK)' },
  { code: 'K', description: 'SUSPENDED (RETURNS)' },
  { code: 'L', description: 'SUSPENDED (LITIGATION)' },
  { code: 'M', description: 'SUSPENDED (IN WORK)' },
  { code: 'N', description: 'SUSPENDED (AMMUNITION SUITABLE FOR EMERGENCY COMBAT USE ONLY)' },
  { code: 'P', description: 'UNSERVICEABLE (RECLAMATION)' },
  { code: 'Q', description: 'SUSPENDED (PRODUCT QUALITY DEFICIENCY)' },
  { code: 'R', description: 'SUSPENDED (RECLAIMED ITEMS, AWAITING CONDITION DETERMINATION)' },
  { code: 'S', description: 'UNSERVICEABLE (SCRAP)' },
  { code: 'T', description: 'SERVICEABLE (AMMUNITION SUITABLE FOR TRAINING USE ONLY)' },
  { code: 'V', description: 'UNSERVICEABLE (WASTE MILITARY MUNITIONS)' },
  { code: 'X', description: 'SUSPENDED (REPAIR DECISION DELAYED)' }
];

// Calculate quantity short
export const calculateQtyShort = (qtyAuthorized: number, qtyOnHand: number): number => {
  return Math.max(0, qtyAuthorized - qtyOnHand);
}; 