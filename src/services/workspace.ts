/**
 * Google Workspace Service
 * Handles client-side API requests with Bearer token authentication for:
 * - Google Sheets
 * - Google Docs
 * - Google Chat
 * - Gmail
 */

// ---------------- Google Sheets ---------------- //

export interface SheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export async function listRecentSpreadsheets(token: string): Promise<SheetFile[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=15`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function readSpreadsheetValues(
  token: string,
  spreadsheetId: string,
  range?: string
): Promise<{ headers: string[]; rows: any[][]; title?: string }> {
  // First fetch spreadsheet metadata to get the first sheet name if not specified
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read spreadsheet metadata (${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const title = metaData.properties?.title || 'Spreadsheet';
  const firstSheetName = metaData.sheets?.[0]?.properties?.title || 'Sheet1';
  const targetRange = range || `'${firstSheetName}'!A1:ZZ500`;

  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetRange)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch sheet values (${valuesRes.status})`);
  }

  const data = await valuesRes.json();
  const allRows: any[][] = data.values || [];

  if (allRows.length === 0) {
    return { headers: [], rows: [], title };
  }

  const headers = allRows[0].map((h: any) => String(h || '').trim());
  const rows = allRows.slice(1);

  return { headers, rows, title };
}

export async function createSpreadsheetWithData(
  token: string,
  title: string,
  values: any[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'Data Dictionary & Audit',
            gridProperties: { rowCount: Math.max(100, values.length + 10), columnCount: 10 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create spreadsheet (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Insert values
  if (values.length > 0) {
    const range = "'Data Dictionary & Audit'!A1";
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        range
      )}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    if (!updateRes.ok) {
      console.warn('Could not populate initial spreadsheet cells', await updateRes.text());
    }
  }

  return { spreadsheetId, spreadsheetUrl };
}

// ---------------- Google Docs ---------------- //

export async function createDocumentWithContent(
  token: string,
  title: string,
  text: string
): Promise<{ documentId: string; documentUrl: string }> {
  // 1. Create document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Doc (${createRes.status})`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Insert text via batchUpdate
  if (text && text.trim().length > 0) {
    const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: `${text}\n\n`,
            },
          },
        ],
      }),
    });

    if (!insertRes.ok) {
      console.warn('Failed to insert initial text into document', await insertRes.text());
    }
  }

  return { documentId, documentUrl };
}

// ---------------- Google Chat ---------------- //

export interface ChatSpace {
  name: string; // e.g. "spaces/AAAAAAAAAAA"
  displayName?: string;
  type?: string; // "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE"
}

export async function listChatSpaces(token: string): Promise<ChatSpace[]> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=25', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error(
        'Google Chat app not found. Note: Google Chat API requires a Google Workspace (business/enterprise) account with the Chat API configured in Cloud Console.'
      );
    }
    throw new Error(err.error?.message || `Failed to list Google Chat spaces (${res.status})`);
  }

  const data = await res.json();
  return data.spaces || [];
}

export async function sendChatMessage(
  token: string,
  spaceName: string,
  messageText: string
): Promise<{ name: string; text: string }> {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: messageText }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send chat message (${res.status})`);
  }

  return await res.json();
}

// ---------------- Gmail ---------------- //

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyText: string;
}

export async function sendEmail(token: string, params: SendEmailParams): Promise<{ id: string }> {
  // Construct RFC 2822 email message
  const emailLines = [
    `To: ${params.to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    '',
    params.bodyText,
  ];

  const rawEmail = emailLines.join('\r\n');
  // Base64url encode (RFC 4648 §5)
  const base64Url = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email via Gmail (${res.status})`);
  }

  return await res.json();
}

export async function getGmailProfile(token: string): Promise<{ emailAddress: string }> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch Gmail profile');
  }

  return await res.json();
}
