import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from '../src/config';
import { ElasticsearchService } from '../src/services/elasticsearch.service';
import { IMAPService } from '../src/services/imap.service';
import { CategorizationService } from '../src/services/categorization.service';
import { NotificationService } from '../src/services/notification.service';
import { RAGService } from '../src/services/rag.service';
import { EmailController } from '../src/controllers/email.controller';
import { createRoutes } from '../src/routes';
import { Email } from '../src/types';
import path from 'path';
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
    this.app.use(cors({
  origin: ['*','http://localhost:8080', `${process.env.frontendurl}`],
  credentials: true
}));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    //serve index.html
    // Serve the single HTML file from frontend/public
this.app.use(express.static(path.join(__dirname, '../../frontend/public')));
this.app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});
  }

  private setupRoutes(): void {
    const router = createRoutes(this.emailController);
    this.app.use('/api', router);
  }

  private async handleNewEmail(email: Email): Promise<void> {
    try {
      //filter email
      const category = this.categorizationService.categorizeEmail(email);
      email.category = category;

      // indes in elastic
      await this.elasticsearchService.indexEmail(email);
      
      console.log(`Email processed: ${email.subject} [${category}]`);

      //notification
      await this.notificationService.notifyInterestedEmail(email);
    } catch (error) {
      console.error('Error handling new email:', error);
    }
  }

  private setupIMAPConnections(): void {
    config.imapAccounts.forEach((accountConfig) => {
      if (!accountConfig.user || !accountConfig.password) {
        console.log(`Skipping account ${accountConfig.id} - missing credentials`);
        return;
      }

      const imapService = new IMAPService(accountConfig);
      
      imapService.on('email', (email: Email) => {
        this.handleNewEmail(email);
      });

      this.imapServices.push(imapService);
      imapService.connect();
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize elastic search
      console.log('Initializing Elasticsearch...');
      await this.elasticsearchService.initialize();
      console.log('Elasticsearch initialized');

    
      console.log('Starting IMAP connections...');
      this.setupIMAPConnections();

      // exp server
      this.app.listen(config.port, () => {
        console.log(`\n Email Sync Server running on port ${config.port}`);
        console.log(` Monitoring ${this.imapServices.length} email account(s)`);
        console.log(` Elasticsearch: ${config.elasticsearch.url}`);
        console.log(`\nAPI Endpoints:`);
        console.log(`  GET  /api/health`);
        console.log(`  GET  /api/emails?query=<search>&folder=<folder>&accountId=<account>&category=<category>`);
        console.log(`  GET  /api/emails/:id`);
        console.log(`  GET  /api/emails/:id/reply`);
        console.log(`  PUT  /api/emails/:id/category`);
        console.log(`  GET  /api/statistics`);
        console.log(`\n Frontend: http://localhost:${config.port}\n`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping IMAP connections...');
    this.imapServices.forEach(service => service.disconnect());
  }
}

// start
const server = new EmailSyncServer();
server.start();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});
