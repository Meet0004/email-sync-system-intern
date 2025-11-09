import { Email } from '../types';
import { config } from '../config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

interface ContextDocument {
  id: string;
  text: string;
  embedding?: number[];
}

export class RAGService {
  private openai: OpenAI | null = null;
  private contextDocs: ContextDocument[] = [];
  private vectorDbPath: string;

  constructor() {
    this.vectorDbPath = config.vectorDb.path;
    
    if (config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey
      });
    }

    this.initializeVectorDB();
  }

  private initializeVectorDB(): void {
    // just create dir if not exists
    if (!fs.existsSync(this.vectorDbPath)) {
      fs.mkdirSync(this.vectorDbPath, { recursive: true });
    }

    // Load existing context documents if any
    this.contextDocs = [
      {
        id: 'product_context',
        text: config.productContext
      },
      {
        id: 'meeting_link',
        text: 'For scheduling meetings, use this link: https://cal.com/example'
      },
      {
        id: 'availability',
        text: 'I am available for meetings and discussions. Please feel free to book a time slot that works for you.'
      },
      {
        id: 'interest_response',
        text: 'Thank you for your interest! I would be happy to discuss this opportunity further.'
      },
      {
        id: 'interview_ready',
        text: 'Thank you for considering my profile. I am available for interviews and technical discussions.'
      }
    ];

    // SAVE
    this.saveVectorDB();
  }

  private saveVectorDB(): void {
    const dbFile = path.join(this.vectorDbPath, 'context_docs.json');
    fs.writeFileSync(dbFile, JSON.stringify(this.contextDocs, null, 2));
  }

  private loadVectorDB(): void {
    const dbFile = path.join(this.vectorDbPath, 'context_docs.json');
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile, 'utf-8');
      this.contextDocs = JSON.parse(data);
    }
  }

  private calculateSimilarity(text1: string, text2: string): number {
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const common = words1.filter(word => words2.includes(word));
    return common.length / Math.max(words1.length, words2.length);
  }

  private retrieveRelevantContext(emailText: string): string[] {
  
    const scored = this.contextDocs.map(doc => ({
      doc,
      score: this.calculateSimilarity(emailText, doc.text)
    }));

    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, 3).map(item => item.doc.text);
  }

  async generateReply(email: Email): Promise<string> {
    const emailText = `${email.subject} ${email.body}`;
    const relevantContext = this.retrieveRelevantContext(emailText);

    if (this.openai) {
      return this.generateWithOpenAI(email, relevantContext);
    } else {
      return this.generateWithRules(email, relevantContext);
    }
  }

  private async generateWithOpenAI(email: Email, context: string[]): Promise<string> {
    try {
      const prompt = `You are an AI assistant helping to draft professional email replies.

Context about the user:
${context.join('\n\n')}

Email received:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Generate a professional, concise reply to this email. The reply should:
1. Be friendly and professional
2. Address the main points in the email
3. Include relevant information from the context (like meeting links if discussing scheduling)
4. Be concise (2-4 sentences)
5. End with a clear call-to-action if needed

Reply:`;

      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email assistant that writes clear, concise, and friendly responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return completion.choices[0].message.content || this.generateWithRules(email, context);
    } catch (error) {
      console.error('Error generating reply with OpenAI:', error);
      return this.generateWithRules(email, context);
    }
  }

  private generateWithRules(email: Email, context: string[]): string {
    const emailText = `${email.subject} ${email.body}`.toLowerCase();
    
    // Interview/Meeting scheduling
    if (emailText.includes('interview') || 
        emailText.includes('schedule') || 
        emailText.includes('available') ||
        emailText.includes('when are you free')) {
      return `Thank you for reaching out! I'm very interested in discussing this opportunity further. I'm available for an interview at your convenience. Please feel free to book a time slot that works best for you: https://cal.com/example

Looking forward to speaking with you!

Best regards`;
    }

    // profile shortlisted
    if (emailText.includes('shortlisted') || 
        emailText.includes('selected') || 
        emailText.includes('congratulations')) {
      return `Thank you for considering my profile! I'm excited about this opportunity and would be happy to proceed with the next steps. 

I'm available for an interview or discussion at your convenience. You can book a time slot here: https://cal.com/example

Looking forward to connecting!

Best regards`;
    }

    // genre interest response
    if (emailText.includes('interested') || 
        emailText.includes('opportunity') || 
        emailText.includes('position')) {
      return `Thank you for your interest! I would be delighted to discuss this opportunity in more detail. 

I'm available for a call or meeting. Please feel free to schedule a time that works for you: https://cal.com/example

Best regards`;
    }

    // techl discussion
    if (emailText.includes('technical') || 
        emailText.includes('skills') || 
        emailText.includes('experience')) {
      return `Thank you for your email! I'd be happy to discuss my technical background and experience in detail. 

I'm available for a technical discussion at your convenience. You can schedule a meeting here: https://cal.com/example

Looking forward to our conversation!

Best regards`;
    }

    // def response
    return `Thank you for reaching out! I appreciate your interest and would be happy to discuss this further.

I'm available for a call or meeting. Please schedule a time that works for you: https://cal.com/example

Best regards`;
  }

  addContextDocument(id: string, text: string): void {
    this.contextDocs.push({ id, text });
    this.saveVectorDB();
  }
}