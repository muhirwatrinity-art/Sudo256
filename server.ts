import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Configure body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure Multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.csv') || file.mimetype === 'text/csv' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  },
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Infer Data Types & Calculate Basic Stats
function analyzeCsvRows(rows: Record<string, any>[], fields: string[]) {
  const dtypes: Record<string, string> = {};
  const stats: Record<string, { nullCount: number; uniqueCount: number; sampleValues: any[] }> = {};

  for (const field of fields) {
    let nonNullCount = 0;
    let intCount = 0;
    let floatCount = 0;
    let dateCount = 0;
    let boolCount = 0;
    const uniqueValues = new Set<string>();
    const samples: any[] = [];

    for (const row of rows) {
      const val = row[field];
      if (val === undefined || val === null || val === '' || val === 'NaN' || val === 'null' || val === 'NA') {
        continue;
      }
      nonNullCount++;
      const strVal = String(val).trim();
      if (uniqueValues.size < 50) {
        uniqueValues.add(strVal);
      }
      if (samples.length < 3 && !samples.includes(strVal)) {
        samples.push(strVal);
      }

      if (/^(true|false|1|0)$/i.test(strVal) && strVal.length <= 5) {
        boolCount++;
      } else if (/^-?\d+$/.test(strVal)) {
        intCount++;
      } else if (/^-?\d+\.\d+$/.test(strVal)) {
        floatCount++;
      } else if (
        (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(strVal) ||
          /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(strVal) ||
          /^\d{4}-\d{2}-\d{2}T/.test(strVal)) &&
        !isNaN(Date.parse(strVal))
      ) {
        dateCount++;
      }
    }

    const total = rows.length;
    const nullCount = total - nonNullCount;

    let inferred = 'String';
    if (nonNullCount > 0) {
      if (intCount / nonNullCount > 0.85) inferred = 'Integer';
      else if ((intCount + floatCount) / nonNullCount > 0.85) inferred = 'Float / Decimal';
      else if (dateCount / nonNullCount > 0.85) inferred = 'Timestamp / Date';
      else if (boolCount / nonNullCount > 0.85) inferred = 'Boolean';
      else if (uniqueValues.size <= Math.min(10, nonNullCount * 0.15)) inferred = 'Categorical';
    }

    dtypes[field] = inferred;
    stats[field] = {
      nullCount,
      uniqueCount: uniqueValues.size,
      sampleValues: samples,
    };
  }

  return { dtypes, stats };
}

// Built-in Sample Datasets for 1-Click Testing
const SAMPLE_DATASETS: Record<string, { name: string; description: string; csv: string }> = {
  clinical: {
    name: 'Clinical Trial Cohort 2026',
    description: 'Phase II oncology patient telemetry, dosage, vital signs, biomarker levels, and clinical outcomes.',
    csv: `subject_id,age,gender,treatment_arm,baseline_systolic_bp,biomarker_cea_ng_ml,adverse_event_grade,last_visit_date,trial_completion
SUBJ-1001,58,Female,Arm-A (50mg),132,4.8,0,2026-03-15,true
SUBJ-1002,64,Male,Arm-B (100mg),148,12.3,2,2026-04-02,false
SUBJ-1003,47,Female,Placebo,121,2.1,0,2026-04-10,true
SUBJ-1004,71,Male,Arm-B (100mg),155,18.9,3,2026-02-28,false
SUBJ-1005,52,Other,Arm-A (50mg),128,5.4,1,2026-03-30,true
SUBJ-1006,60,Female,Placebo,130,3.2,0,2026-04-18,true
SUBJ-1007,,Male,Arm-B (100mg),,14.6,2,2026-03-22,false
SUBJ-1008,55,Female,Arm-A (50mg),135,,0,2026-04-05,true
SUBJ-1009,68,Male,Arm-A (50mg),142,6.7,1,2026-04-12,true
SUBJ-1010,49,Female,Placebo,118,2.4,0,2026-04-20,true`,
  },
  ecommerce: {
    name: 'E-Commerce Churn & Retention',
    description: 'Customer transaction volume, churn flags, annual recurring spend, customer support tickets, and signup cohorts.',
    csv: `customer_uuid,account_tenure_months,subscription_tier,annual_spend_usd,support_tickets_30d,avg_session_duration_min,opt_in_marketing,churned_status
CUST-9821,24,Enterprise,14500.50,1,45.2,true,ACTIVE
CUST-9822,3,Starter,499.00,8,12.4,false,CHURNED
CUST-9823,12,Professional,3200.00,2,33.8,true,ACTIVE
CUST-9824,36,Enterprise,22800.75,0,58.1,true,ACTIVE
CUST-9825,1,Starter,249.00,5,8.2,false,CHURNED
CUST-9826,18,Professional,4100.20,3,29.5,true,ACTIVE
CUST-9827,8,Starter,750.00,12,15.1,false,CHURNED
CUST-9828,29,Enterprise,18900.00,1,50.0,true,ACTIVE
CUST-9829,15,Professional,3600.00,2,38.4,true,ACTIVE
CUST-9830,5,Starter,499.00,6,11.0,false,CHURNED`,
  },
  environmental: {
    name: 'Urban Air Quality Sensor Grid',
    description: 'High-frequency particulate matter (PM2.5, PM10), nitrogen dioxide, ambient temperature, and humidity sensors across metropolitan hubs.',
    csv: `station_code,timestamp_utc,pm25_ug_m3,pm10_ug_m3,no2_ppb,ambient_temp_c,relative_humidity_pct,sensor_battery_v,status_flag
STN-CENTRAL-01,2026-10-01T08:00:00Z,14.2,28.5,18.4,19.2,62.4,3.82,NORMAL
STN-CENTRAL-01,2026-10-01T09:00:00Z,18.6,34.1,22.1,20.5,59.8,3.80,NORMAL
STN-CENTRAL-01,2026-10-01T10:00:00Z,45.8,78.2,41.0,22.1,55.0,3.78,SPIKE_ALERT
STN-NORTH-04,2026-10-01T08:00:00Z,9.5,18.0,12.3,17.8,68.2,3.95,NORMAL
STN-NORTH-04,2026-10-01T09:00:00Z,11.2,21.4,14.0,18.9,65.0,3.93,NORMAL
STN-SOUTH-09,2026-10-01T08:00:00Z,32.4,58.9,29.8,21.4,51.2,3.60,CALIBRATION_REQ
STN-SOUTH-09,2026-10-01T09:00:00Z,28.1,52.0,27.5,22.0,49.8,3.58,NORMAL
STN-HARBOR-02,2026-10-01T08:00:00Z,8.1,15.2,9.8,16.5,75.1,4.02,NORMAL
STN-HARBOR-02,2026-10-01T09:00:00Z,8.4,15.9,10.2,17.1,73.5,4.00,NORMAL
STN-HARBOR-02,2026-10-01T10:00:00Z,9.0,16.8,11.0,18.0,71.0,3.98,NORMAL`,
  },
};

// ----------------- API ROUTES ----------------- //

// 1. Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Sample Datasets endpoint
app.get('/api/sample-datasets', (_req: Request, res: Response) => {
  res.json(SAMPLE_DATASETS);
});

// 2. CSV Upload & Processing Endpoint
// Supports either multipart file upload OR JSON body with { csvText, filename } or sample key
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    let csvContent = '';
    let filename = 'dataset.csv';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
      filename = req.file.originalname;
    } else if (req.body?.sampleKey && SAMPLE_DATASETS[req.body.sampleKey]) {
      const sample = SAMPLE_DATASETS[req.body.sampleKey];
      csvContent = sample.csv;
      filename = `${req.body.sampleKey}_sample.csv`;
    } else if (req.body?.csvText) {
      csvContent = req.body.csvText;
      filename = req.body.filename || 'pasted_dataset.csv';
    } else {
      res.status(400).json({ error: 'No CSV file or data provided. Please upload a CSV file.' });
      return;
    }

    if (!csvContent || csvContent.trim().length === 0) {
      res.status(400).json({ error: 'The uploaded CSV file is empty.' });
      return;
    }

    const parseResult = Papa.parse<Record<string, any>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      const fatalErrors = parseResult.errors.filter(
        (e) => e.type !== 'Delimiter' && e.code !== 'UndetectableDelimiter'
      );
      if (fatalErrors.length > 0 && (!parseResult.data || parseResult.data.length === 0)) {
        res.status(400).json({
          error: `Failed to parse CSV: ${fatalErrors[0].message} (line ${fatalErrors[0].row})`,
        });
        return;
      }
    }

    const rows = parseResult.data;
    if (!rows || rows.length === 0) {
      res.status(400).json({ error: 'The CSV file contains no data rows.' });
      return;
    }

    const columns = parseResult.meta.fields || Object.keys(rows[0] || {});
    if (columns.length === 0) {
      res.status(400).json({ error: 'Could not extract column headers from CSV.' });
      return;
    }

    const preview = rows.slice(0, 10);
    const { dtypes, stats } = analyzeCsvRows(rows, columns);

    const summary = {
      filename,
      columns,
      dtypes,
      stats,
      preview,
      row_count: rows.length,
      col_count: columns.length,
      uploaded_at: new Date().toISOString(),
    };

    res.json(summary);
  } catch (err: any) {
    console.error('Error in /api/upload:', err);
    res.status(500).json({ error: `An unexpected error occurred while parsing CSV: ${err.message}` });
  }
});

// 3. AI Schema Analysis & Data Dictionary Generator
app.post('/api/analyze-schema', async (req: Request, res: Response) => {
  try {
    const summary = req.body.summary || req.body;
    if (!summary || !summary.columns || !Array.isArray(summary.columns)) {
      res.status(400).json({ error: 'Invalid payload: "summary" with columns array is required.' });
      return;
    }

    const prompt = `
Task: Parse the provided schema sample and output a structured data dictionary.

Input Schema Snippet:
${JSON.stringify(summary, null, 2)}

Required JSON Output Format:
{
  "dataset_summary": "Brief explanation of the dataset context.",
  "columns": [
    {
      "column_name": "string",
      "inferred_type": "string",
      "description": "string",
      "cleaning_recommendation": "string",
      "risk_flag": "LOW | MEDIUM | HIGH"
    }
  ],
  "overall_data_quality_score": 0.0
}

Instructions:
1. Provide a comprehensive dataset_summary outlining the domain, operational context, and apparent business/research purpose.
2. For each column, define:
   - column_name: exact column name
   - inferred_type: clean semantic type (e.g. Integer, Float, ISO-8601 Timestamp, Categorical, Boolean, UUID/Identifier, Free-text)
   - description: thorough explanation of what this variable measures or tracks
   - cleaning_recommendation: specific actionable advice (e.g. handle null imputation, regex format checks, z-score outlier bounds, datetime normalization)
   - risk_flag: LOW, MEDIUM, or HIGH based on data leakage, PII risk, high cardinality nulls, or severe bias potential
3. overall_data_quality_score: float between 0.0 and 1.0 (e.g. 0.88) calculated based on completeness, type uniformity, and risk factor severity.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a principal data scientist and research data steward. You parse dataset schema previews and generate rigorous, structured data dictionaries with data quality evaluations.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dataset_summary: {
              type: Type.STRING,
              description: 'Brief explanation of the dataset context.',
            },
            columns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  column_name: { type: Type.STRING },
                  inferred_type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  cleaning_recommendation: { type: Type.STRING },
                  risk_flag: {
                    type: Type.STRING,
                    description: 'LOW, MEDIUM, or HIGH',
                  },
                },
                required: ['column_name', 'inferred_type', 'description', 'cleaning_recommendation', 'risk_flag'],
              },
            },
            overall_data_quality_score: {
              type: Type.NUMBER,
              description: 'Overall quality score between 0.0 and 1.0',
            },
          },
          required: ['dataset_summary', 'columns', 'overall_data_quality_score'],
        },
      },
    });

    const rawText = response.text || '{}';
    let dictionaryData: any;
    try {
      dictionaryData = JSON.parse(rawText);
    } catch {
      // Fallback regex cleaning if needed
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      dictionaryData = JSON.parse(cleaned);
    }

    // Sanitize risk flag strings to uppercase enum
    if (dictionaryData.columns && Array.isArray(dictionaryData.columns)) {
      dictionaryData.columns = dictionaryData.columns.map((c: any) => ({
        ...c,
        risk_flag: ['HIGH', 'MEDIUM', 'LOW'].includes(String(c.risk_flag).toUpperCase())
          ? String(c.risk_flag).toUpperCase()
          : 'LOW',
      }));
    }

    // Ensure quality score is a valid number between 0 and 1
    if (typeof dictionaryData.overall_data_quality_score !== 'number' || isNaN(dictionaryData.overall_data_quality_score)) {
      dictionaryData.overall_data_quality_score = 0.85;
    } else if (dictionaryData.overall_data_quality_score > 1.0) {
      dictionaryData.overall_data_quality_score = Math.min(1.0, dictionaryData.overall_data_quality_score / 100);
    }

    res.json(dictionaryData);
  } catch (err: any) {
    console.error('Error in /api/analyze-schema:', err);
    res.status(500).json({ error: `AI Schema Analysis failed: ${err.message}` });
  }
});

// 4. AI Methodology Generator
app.post('/api/generate-methodology', async (req: Request, res: Response) => {
  try {
    const { notes, dataset_summary, context } = req.body;
    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      res.status(400).json({ error: 'Please provide informal cleaning notes to formalize.' });
      return;
    }

    const prompt = `
You are a senior biostatistician and scientific data engineering expert. Convert the following informal data cleaning notes into a professional, formal "Data Cleaning & Preprocessing" methodology section suitable for publication in a peer-reviewed academic journal (e.g., Nature Methods, PLOS ONE, JAMA, or IEEE Transactions).

Informal Cleaning Notes:
"""
${notes.trim()}
"""

${dataset_summary ? `Dataset Context: ${dataset_summary}` : ''}
${context ? `Additional Technical Context: ${context}` : ''}

Guidelines for Output:
- Write in formal academic scientific prose, predominantly using passive voice (e.g., "Outliers were identified via...", "Missing values were imputed using...").
- Organize logically into clear titled sub-sections:
  1. Data Ingestion & Integrity Auditing
  2. Missing Data Handling & Imputation Strategy
  3. Normalization, Scaling & Type Transformations
  4. Outlier Detection & Anomaly Mitigation
  5. Privacy, De-identification & Compliance Verification
- Provide precise statistical justification for the recorded adjustments.
- Use clean Markdown format with headers (###), bullet points, and code/math notations where appropriate.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert academic writer and statistician producing peer-review standard methodology documentation.',
      },
    });

    res.json({
      methodology: response.text || 'No methodology generated.',
    });
  } catch (err: any) {
    console.error('Error in /api/generate-methodology:', err);
    res.status(500).json({ error: `Methodology generation failed: ${err.message}` });
  }
});

// ----------------- VITE MIDDLEWARE / STATIC ASSETS ----------------- //

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // In dev mode, mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Research Data Studio] Server running on port ${PORT} (dev: ${!isProd})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
