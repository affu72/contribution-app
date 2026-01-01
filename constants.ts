
import { Month } from './types';

export const MONTHS: Month[] = [
  Month.JANUARY, Month.FEBRUARY, Month.MARCH, Month.APRIL,
  Month.MAY, Month.JUNE, Month.JULY, Month.AUGUST,
  Month.SEPTEMBER, Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER
];

export const APP_YEAR = 2025;

/** 
 * GOOGLE SHEETS CONFIGURATION
 * Now fully configured with the user's credentials.
 */
export const CLIENT_ID = '428530443932-ao7m306rv87qsafimf6niukfhfs5pffd.apps.googleusercontent.com';
export const SPREADSHEET_ID = '106IUed-GqVWdtb7NIOWWf_tmx05RBkoPMuptY5adjTs';
export const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
export const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
