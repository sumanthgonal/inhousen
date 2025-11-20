# Invoice Processor

A full-stack web application that extracts structured data from invoice documents (PDF/JPG/PNG) using AI/LLM providers (OpenAI GPT-4 Vision or Google Gemini).

## Features

- **Upload**: Drag & drop or click to upload invoices (PDF, JPG, PNG up to 10MB)
- **AI Extraction**: Automatically extract invoice fields using OpenAI or Gemini
- **Review & Edit**: Review extracted data and make corrections
- **Persistence**: Store all invoice data in PostgreSQL
- **REST API**: Full CRUD operations for invoice management
- **Provider Abstraction**: Switch between OpenAI and Gemini easily

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **LLM**: OpenAI GPT-4 Vision / Google Gemini 1.5 Flash
- **Validation**: Zod
- **File Upload**: Multer

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key and/or Google Gemini API key

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_processor"

# LLM Providers
OPENAI_API_KEY="sk-your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"

# Default LLM provider (openai or gemini)
LLM_PROVIDER="openai"

# Server
PORT=3001
NODE_ENV="development"

# File Upload
MAX_FILE_SIZE_MB=10
UPLOAD_DIR="./uploads"
```

### 3. Set Up Database

```bash
cd backend

# Create database (if not exists)
# psql -U postgres -c "CREATE DATABASE invoice_processor;"

# Generate Prisma client and push schema
npm run db:generate
npm run db:push
```

### 4. Start the Application

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invoices/upload` | Upload an invoice file |
| POST | `/api/invoices/upload-and-extract` | Upload and extract in one call |
| POST | `/api/invoices/:id/extract` | Extract data from uploaded invoice |
| GET | `/api/invoices` | List all invoices (paginated) |
| GET | `/api/invoices/:id` | Get single invoice details |
| PUT | `/api/invoices/:id` | Update invoice data |
| DELETE | `/api/invoices/:id` | Delete an invoice |
| GET | `/health` | Health check |

### Example API Usage

```bash
# Upload and extract invoice
curl -X POST http://localhost:3001/api/invoices/upload-and-extract \
  -F "file=@invoice.pdf" \
  -H "Content-Type: multipart/form-data"

# List invoices
curl http://localhost:3001/api/invoices?page=1&limit=10

# Update invoice
curl -X PUT http://localhost:3001/api/invoices/cuid123 \
  -H "Content-Type: application/json" \
  -d '{"supplierName": "Updated Name", "status": "SAVED"}'
```

## Data Model

### Invoice
```typescript
{
  id: string
  status: 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'NEEDS_REVIEW' | 'SAVED' | 'ERROR'
  filePath: string
  fileName: string
  supplierName: string | null
  invoiceNumber: string | null
  invoiceDate: string | null  // YYYY-MM-DD
  dueDate: string | null
  currency: string
  subtotal: number | null
  taxAmount: number | null
  total: number | null
  confidence: number  // 0-1 extraction confidence
  rawLlmJson: JSON
  lineItems: LineItem[]
}
```

### LineItem
```typescript
{
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}
```

## Design Choices

### LLM Provider Abstraction
The application uses a provider pattern to support multiple LLMs. Each provider implements a common interface, making it easy to add new providers or switch between them via environment variables or API query parameters.

### Extraction Prompt
The extraction prompt is carefully designed to:
- Request structured JSON output
- Handle missing fields gracefully (null values)
- Include confidence scoring
- Extract both header-level and line-item data

### Error Handling
- Comprehensive error middleware catches all errors
- Custom error classes for different error types
- Validation errors from Zod are formatted clearly
- File upload errors have specific handling

### Rate Limiting
API endpoints are rate-limited to 100 requests per 15-minute window to prevent abuse.

## Limitations

1. **No Authentication**: The current implementation doesn't include user authentication. All invoices are accessible to anyone.

2. **Local File Storage**: Files are stored locally. For production, consider using S3 or similar cloud storage.

3. **Synchronous Processing**: Invoice extraction happens synchronously. For large files or high traffic, consider implementing a job queue.

4. **PDF Handling**: PDFs are sent directly to the LLM as images. Complex multi-page PDFs may not extract perfectly.

5. **No Caching**: LLM responses are not cached. Re-extracting the same invoice will make another API call.

## Future Improvements

- [ ] Add user authentication (JWT)
- [ ] Implement background job processing (Bull + Redis)
- [ ] Add S3 file storage
- [ ] Support multi-page PDF extraction
- [ ] Add unit and integration tests
- [ ] Docker containerization
- [ ] Webhook notifications for extraction completion

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── providers/       # LLM provider implementations
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities
│   ├── prisma/              # Database schema
│   └── uploads/             # Uploaded files
├── frontend/
│   └── src/
│       ├── components/      # React components
│       ├── services/        # API client
│       └── types/           # TypeScript types
└── README.md
```

## License

MIT
