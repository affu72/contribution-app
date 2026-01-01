
export interface User {
  email: string;
  name: string;
  photoUrl?: string;
}

export interface Contribution {
  id: string;
  userEmail: string;
  userName: string;
  amount: number;
  note: string;
  month: string; // e.g., "January"
  year: number;
  timestamp: number;
}

export enum Month {
  JANUARY = 'January',
  FEBRUARY = 'February',
  MARCH = 'March',
  APRIL = 'April',
  MAY = 'May',
  JUNE = 'June',
  JULY = 'July',
  AUGUST = 'August',
  SEPTEMBER = 'September',
  OCTOBER = 'October',
  NOVEMBER = 'November',
  DECEMBER = 'December'
}
