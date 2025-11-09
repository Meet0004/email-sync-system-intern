import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: 'emails'
  },
  
  imapAccounts: [
    {
      id: 'account1',
      user: process.env.IMAP1_USER || '',
      password: process.env.IMAP1_PASSWORD || '',
      host: process.env.IMAP1_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP1_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      id: 'account2',
      user: process.env.IMAP2_USER || '',
      password: process.env.IMAP2_PASSWORD || '',
      host: process.env.IMAP2_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP2_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  ],
  
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
  },
  
  webhook: {
    url: process.env.WEBHOOK_URL || ''
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  
  vectorDb: {
    path: process.env.VECTOR_DB_PATH || './vector_db'
  },
  
  productContext: process.env.PRODUCT_CONTEXT || 'I am applying for a job position.'
};