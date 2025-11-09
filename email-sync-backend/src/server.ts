import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from './config';
import { ElasticsearchService } from './services/elasticsearch.service';
import { IMAPService } from './services/imap.service';
import { CategorizationService } from './services/categorization.service';
import { NotificationService } from './services/notification.service';
import { RAGService } from './services/rag.service';
import { EmailController } from './controllers/email.controller';
import { createRoutes } from './routes';
import { Email } from './types';

class EmailSyncServer {
  private app: express.Application;
  private elasticsearchService: ElasticsearchService;
  private imapServices: IMAPService[] = [];
  private categorizationService: CategorizationService;
  private notificationService: NotificationService;
  private ragService: RAGService;
  private emailController: EmailController;

  constructor() {
    this.app = express();
    this.elasticsearchService = new ElasticsearchService();
    this.categorizationService = new CategorizationService();
    this.notificationService = new NotificationService();
    this.ragService = new RAGService();
    this.emailController = new EmailController(
      this.elasticsearchService,
      this.ragService
    );

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS - Allow all origins for now
    this.app.use(cors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsers
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Root route - API info
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Email Sync Backend API is running! ✅',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/api/health',
          searchEmails: '/api/emails',
          getEmail: '/api/emails/:id',
          generateReply: '/api/emails/:id/reply',
          updateCategory: '/api/emails/:id/category',
          statistics: '/api/statistics'
        },
        status: {
          elasticsearch: 'checking...',
          imapAccounts: this.imapServices.length
        }
      });
    });

    // API routes
    const apiRouter = createRoutes(this.emailController);
    this.app.use('/api', apiRouter);

    // 404 handler - MUST be after all routes
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        requestedPath: req.originalUrl,
        method: req.method,
        availableRoutes: [
          'GET /',
          'GET /api/health',
          'GET /api/emails',
          'GET /api/emails/:id',
          'GET /api/emails/:id/reply',
          'PUT /api/emails/:id/category',
          'GET /api/statistics'
        ]
      });
    });

    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  private async handleNewEmail(email: Email): Promise<void> {
    try {
      const category = this.categorizationService.categorizeEmail(email);
      email.category = category;

      await this.elasticsearchService.indexEmail(email);
      
      console.log(`✅ Email processed: ${email.subject} [${category}]`);

      await this.notificationService.notifyInterestedEmail(email);
    } catch (error) {
      console.error('❌ Error handling new email:', error);
    }
  }

  private setupIMAPConnections(): void {
    config.imapAccounts.forEach((accountConfig) => {
      if (!accountConfig.user || !accountConfig.password) {
        console.log(`⚠️  Skipping account ${accountConfig.id} - missing credentials`);
        return;
      }

      try {
        const imapService = new IMAPService(accountConfig);
        
        imapService.on('email', (email: Email) => {
          this.handleNewEmail(email);
        });

        this.imapServices.push(imapService);
        imapService.connect();
        console.log(`✅ IMAP connected: ${accountConfig.user}`);
      } catch (error) {
        console.error(`❌ IMAP connection failed for ${accountConfig.user}:`, error);
      }
    });
  }

  async start(): Promise<void> {
    try {
      console.log('\n🚀 Starting Email Sync Server...\n');

      // Initialize Elasticsearch
      console.log('📊 Initializing Elasticsearch...');
      await this.elasticsearchService.initialize();
      console.log('✅ Elasticsearch initialized\n');

      // Start IMAP connections (don't wait for them)
      console.log('📧 Starting IMAP connections...');
      this.setupIMAPConnections();
      console.log(`✅ IMAP setup complete (${this.imapServices.length} accounts)\n`);

      // Start Express server
      const PORT = process.env.PORT || config.port || 10000;
      this.app.listen(PORT, () => {
        console.log('╔════════════════════════════════════════╗');
        console.log('║   Email Sync Server is RUNNING! 🎉    ║');
        console.log('╚════════════════════════════════════════╝');
        console.log(`\n📍 Port: ${PORT}`);
        console.log(`📍 Root: http://localhost:${PORT}/`);
        console.log(`📍 API Health: http://localhost:${PORT}/api/health`);
        console.log(`📍 Statistics: http://localhost:${PORT}/api/statistics`);
        console.log(`\n✅ Server ready to accept requests!\n`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Stopping IMAP connections...');
    this.imapServices.forEach(service => service.disconnect());
    console.log('✅ Server stopped\n');
  }
}

// Create and start server
const server = new EmailSyncServer();
server.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
