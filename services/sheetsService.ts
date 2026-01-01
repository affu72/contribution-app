
import { Contribution, Month } from '../types';
import { SPREADSHEET_ID } from '../constants';

export const sheetsService = {
  async ensureGapi() {
    return new Promise((resolve) => {
      if (window.gapi && window.gapi.client && window.gapi.client.sheets) {
        resolve(true);
      } else {
        const check = setInterval(() => {
          if (window.gapi?.client?.sheets) {
            clearInterval(check);
            resolve(true);
          }
        }, 100);
      }
    });
  },

  /**
   * Creates a new sheet (tab) for a month if it doesn't exist.
   */
  async createSheet(month: Month): Promise<void> {
    await this.ensureGapi();
    try {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: month,
                },
              },
            },
          ],
        },
      });

      // Add Headers
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${month}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['ID', 'Email', 'Name', 'Amount', 'Note', 'Timestamp']],
        },
      });
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      throw err;
    }
  },

  async fetchContributions(month: Month): Promise<Contribution[]> {
    await this.ensureGapi();
    try {
      const range = `${month}!A2:F`;
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
      });

      const rows = response.result.values || [];
      return rows.map((row: any[], index: number) => ({
        id: row[0],
        userEmail: row[1],
        userName: row[2],
        amount: parseFloat(row[3]) || 0,
        note: row[4] || '',
        month: month,
        year: 2025,
        timestamp: parseInt(row[5]) || Date.now(),
        rowIndex: index + 2
      })) as Contribution[];
    } catch (err: any) {
      // If the specific month sheet doesn't exist, create it and return empty
      if (err.status === 400 && err.result?.error?.message?.includes('not find range')) {
        await this.createSheet(month);
        return [];
      }
      throw err;
    }
  },

  async addContribution(contribution: Omit<Contribution, 'id' | 'timestamp'>): Promise<void> {
    await this.ensureGapi();
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    const values = [
      [id, contribution.userEmail, contribution.userName, contribution.amount, contribution.note, timestamp]
    ];

    try {
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${contribution.month}!A2:F`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });
    } catch (err: any) {
       if (err.status === 400) {
         await this.createSheet(contribution.month as Month);
         await this.addContribution(contribution); // Retry once
         return;
       }
       throw err;
    }
  },

  async updateContribution(id: string, updates: Partial<Contribution>, month: Month): Promise<void> {
    await this.ensureGapi();
    const currentData = await this.fetchContributions(month);
    const contribution = currentData.find(c => c.id === id);
    const rowIndex = (contribution as any)?.rowIndex;

    if (!rowIndex) throw new Error("Could not find row to update");

    const range = `${month}!A${rowIndex}:F${rowIndex}`;
    const values = [[
      id,
      contribution?.userEmail,
      contribution?.userName,
      updates.amount ?? contribution?.amount,
      updates.note ?? contribution?.note,
      contribution?.timestamp
    ]];

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
  },

  async deleteContribution(id: string, month: Month): Promise<void> {
    await this.ensureGapi();
    const currentData = await this.fetchContributions(month);
    const contribution = currentData.find(c => c.id === id);
    const rowIndex = (contribution as any)?.rowIndex;

    if (!rowIndex) return;

    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A${rowIndex}:F${rowIndex}`,
    });
  }
};
