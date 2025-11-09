import { Readable } from 'stream';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Email, IMAPConfig } from '../types';

export class IMAPService extends EventEmitter {
  private imap: Imap;
  private config: IMAPConfig;
  private connected = false;

  constructor(config: IMAPConfig) {
    super();
    this.config = config;
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: config.tlsOptions,
      keepalive: {
        interval: 10000,
        idleInterval: 300000,
        forceNoop: true,
      },
    });

    this.setupEventHandlers();
  }

  /** IMAP connection setup event listeners */
  private setupEventHandlers(): void {
    this.imap.once('ready', () => {
      console.log(`✅ IMAP connection ready for ${this.config.user}`);
      this.connected = true;
      this.openInbox();
    });

    this.imap.once('error', (err: Error) => {
      console.error(`❌ IMAP error for ${this.config.user}:`, err);
      this.connected = false;
    });

    this.imap.once('end', () => {
      console.log(`🔌 IMAP connection ended for ${this.config.user}`);
      this.connected = false;
      //reconnect after delay of 5s
      setTimeout(() => this.connect(), 5000);
    });
  }

  // 1st connect to IMAP server
  connect(): void {
    if (!this.connected) {
      this.imap.connect();
    }
  }

  //inbox
  private openInbox(): void {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        return;
      }

      console.log(`📂 Inbox opened for ${this.config.user}`);
      this.fetchRecentEmails();
      this.startIdle();
    });
  }

  // last 30 days
  private fetchRecentEmails(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.imap.search(['ALL', ['SINCE', thirtyDaysAgo]], (err, results) => {
      if (err) {
        console.error('Error searching emails:', err);
        return;
      }

      if (!results || results.length === 0) {
        console.log('No emails found in last 30 days');
        return;
      }

      console.log(`📬 Found ${results.length} emails for ${this.config.user}`);
      this.fetchEmails(results);
    });
  }

  //fetch emails by uids
  private fetchEmails(uids: number[]): void {
    const fetch = this.imap.fetch(uids, { bodies: '', struct: true });

    fetch.on('message', (msg, seqno) => {
      let uid = 0;

      msg.on('body', (stream: NodeJS.ReadableStream) => {
        const nodeStream = stream as unknown as Readable;
        simpleParser(nodeStream, async (err: Error | null, parsed: ParsedMail) => {
          if (err) {
            console.error('Error parsing email:', err);
            return;
          }

          const email: Email = {
            id: `${this.config.id}-${uuidv4()}`,
            accountId: this.config.id,
            folder: 'INBOX',
            from: parsed.from?.text || '',
to:
  parsed.to
    ? Array.isArray(parsed.to)
      ? parsed.to.map((t) => (t as any).address || '')
      : (parsed.to as any).value?.map((t: any) => t.address || '') || []
    : [],
            subject: parsed.subject || '',
            body: parsed.text || '',
            html: parsed.html || '',
            date: parsed.date || new Date(),
            uid: uid || seqno,
          };

          this.emit('email', email);
        });
      });

      msg.once('attributes', (attrs) => {
        uid = attrs.uid;
      });
    });

    fetch.once('error', (err) => {
      console.error('Fetch error:', err);
    });

    fetch.once('end', () => {
      console.log('✅ Fetch completed');
    });
  }

  // IMAP IDLE to listen for new emails
  private startIdle(): void {
    console.log(`📡 Starting IDLE mode for ${this.config.user}`);

    this.imap.on('mail', (numNewMsgs: number) => {
      console.log(`📥 ${numNewMsgs} new email(s) received for ${this.config.user}`);

      if (this.imap.state === 'authenticated') {
        this.imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('Error searching new emails:', err);
            return;
          }

          if (results && results.length > 0) {
            this.fetchEmails(results);
          }
        });
      }
    });

    // Keep the conn on
    const idleCheck = () => {
      if (this.connected && this.imap.state === 'authenticated') {
        this.imap.openBox('INBOX', false, (err) => {
          if (!err) {
            //still alive
          }
        });
      }
      setTimeout(idleCheck, 60000); //1min
    };

    idleCheck();
  }
  disconnect(): void {
    if (this.connected) {
      this.imap.end();
    }
  }
}
