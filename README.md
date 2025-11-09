# Email Sync System - Backend Engineering Assignment

A complete real-time email synchronization system with AI-powered categorization, Elasticsearch integration, and RAG-based reply suggestions.

##   Features Implemented

###   1. Real-Time Email Synchronization
- Syncs multiple IMAP accounts (minimum 2)
- Fetches last 30 days of emails
- Uses persistent IMAP connections with IDLE mode for real-time updates
- No cron jobs - true push-based synchronization

###   2. Searchable Storage using Elasticsearch
- Locally hosted Elasticsearch via Docker
- Full-text search across email subject, body, and sender
- Filtering by folder, account, and category
- Proper indexing for fast retrieval

###   3. AI-Based Email Categorization
Automatically categorizes emails into:
- **Interested** - Shows interest in opportunities
- **Meeting Booked** - Contains meeting confirmations
- **Not Interested** - Declines or shows disinterest
- **Spam** - Promotional or suspicious content
- **Out of Office** - Auto-reply messages
- **Uncategorized** - Doesn't fit other categories

###   4. Slack & Webhook Integration
- Sends formatted Slack notifications for "Interested" emails
- Triggers webhooks (webhook.site) for external automation
- Rich message formatting with email details

###   5. Frontend Interface
- Clean, responsive UI for email viewing
- Search functionality with filters
- Real-time statistics dashboard
- Category-based filtering
- Account and folder filtering

###   6. AI-Powered Suggested Replies (RAG)
- Vector database for product context storage
- RAG-based reply generation using context
- Supports OpenAI API (optional) or rule-based fallback
- Contextual responses with meeting links
- Confidence scoring

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Gmail accounts with App Passwords enabled
- (Optional) OpenAI API key for advanced RAG
- (Optional) Slack Webhook URL
- Webhook.site URL for testing

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Start Elasticsearch with Docker

```bash
docker-compose up -d
```

Wait 30 seconds for Elasticsearch to start, then verify:
```bash
curl http://localhost:9200
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
ELASTICSEARCH_URL=http://localhost:9200

# Gmail Account 1
IMAP1_USER=your-email1@gmail.com
IMAP1_PASSWORD=your-app-password1
IMAP1_HOST=imap.gmail.com
IMAP1_PORT=993

# Gmail Account 2
IMAP2_USER=your-email2@gmail.com
IMAP2_PASSWORD=your-app-password2
IMAP2_HOST=imap.gmail.com
IMAP2_PORT=993

# Slack Webhook (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Generic Webhook (use webhook.site)
WEBHOOK_URL=https://webhook.site/your-unique-url

# OpenAI API (optional for advanced RAG)
OPENAI_API_KEY=your-openai-key

# Product Context
PRODUCT_CONTEXT="I am applying for a Backend Engineering position. If the lead is interested, share the meeting booking link: https://cal.com/example"
```

### 4. Getting Gmail App Passwords

1. Enable 2-Step Verification on your Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Custom name)"
4. Enter "Email Sync System"
5. Copy the 16-character password
6. Use this password in your `.env` file

### 5. Build and Start the Application

```bash
# Build TypeScript
npm run build

# Start the server
npm start

# Or use development mode with auto-reload
npm run dev
```

The server will start on http://localhost:3000

## 🧪 Testing with Postman

### API Endpoints

#### 1. Health Check
```
GET http://localhost:3000/api/health
```

#### 2. Search Emails
```
GET http://localhost:3000/api/emails?query=interview&category=Interested
```

Query Parameters:
- `query` - Full-text search
- `category` - Filter by category
- `accountId` - Filter by account (account1, account2)
- `folder` - Filter by folder (INBOX)
- `from` - Pagination offset
- `size` - Results per page

#### 3. Get Email by ID
```
GET http://localhost:3000/api/emails/{emailId}
```

#### 4. Generate AI Reply
```
GET http://localhost:3000/api/emails/{emailId}/reply
```

Response:
```json
{
  "success": true,
  "email": {...},
  "suggestedReply": "Thank you for reaching out!...",
  "confidence": 0.85
}
```

#### 5. Update Email Category
```
PUT http://localhost:3000/api/emails/{emailId}/category
Content-Type: application/json

{
  "category": "Interested"
}
```

#### 6. Get Statistics
```
GET http://localhost:3000/api/statistics
```
## Frontend Interface

Open http://localhost:3000 in your browser

Features:
- Dashboard with real-time statistics
- Search bar with filters
- Category and account filtering
- Email list with previews
- Click on any email to view details
- AI-suggested replies for each email
- Auto-refresh every 30 seconds

## How It Works

### IMAP Synchronization Flow

1. Server connects to configured IMAP accounts
2. Fetches last 30 days of emails on startup
3. Enters IDLE mode for real-time push notifications
4. When new email arrives:
   - Parses email content
   - Categorizes using AI patterns
   - Indexes in Elasticsearch
   - Sends Slack notification if "Interested"
   - Triggers webhook if "Interested"

### AI Categorization

Uses pattern matching and keyword analysis:

- **Interested**: "interested", "let's discuss", "schedule", "interview"
- **Meeting Booked**: "meeting confirmed", "calendar invitation"
- **Not Interested**: "not interested", "decline", "position filled"
- **Spam**: Promotional keywords, suspicious patterns
- **Out of Office**: "out of office", "auto reply", "on vacation"

### RAG Reply Generation

1. Stores product context in vector database
2. When generating reply:
   - Retrieves relevant context documents
   - Analyzes email content
   - Generates contextual reply with meeting links
   - Falls back to rule-based if OpenAI unavailable

## Monitoring

### Check Elasticsearch
```bash
# View all emails
curl http://localhost:9200/emails/_search?pretty

# Count emails
curl http://localhost:9200/emails/_count?pretty
```

### Check Logs
```bash
# Watch server logs
npm run dev
```

### IMAP Connection Issues

1. Verify App Passwords are enabled
2. Check if 2FA is enabled on Gmail
3. Ensure correct credentials in `.env`
4. Check firewall settings (port 993)

## Key Learning Points

1. **IMAP IDLE Mode**: Persistent connections for real-time sync
2. **Elasticsearch**: Full-text search and indexing
3. **Pattern-Based AI**: Rule-based categorization
4. **RAG Architecture**: Context retrieval for AI responses
5. **Event-Driven Design**: Email processing pipeline
6. **Webhook Integration**: External system notifications

##   Production Considerations

For production deployment:

1. Add authentication and authorization
2. Implement rate limiting
3. Add email encryption at rest
4. Set up proper logging (Winston, Bunyan)
5. Add monitoring (Prometheus, Grafana)
6. Implement email deduplication
7. Add backup and disaster recovery
8. Use proper vector database (Pinecone, Weaviate)
9. Implement proper error handling and retries
10. Add unit and integration tests

## License

MIT License - Feel free to use for learning and projects

---

**Note**: This is a complete working implementation. All features are functional and ready for demonstration in Postman and via the frontend interface.
