export interface Email {
  id: string;
  accountId: string;
  folder: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  uid: number;
  category?: EmailCategory;
  html?: string;
}

export enum EmailCategory {
  INTERESTED = 'Interested',
  MEETING_BOOKED = 'Meeting Booked',
  NOT_INTERESTED = 'Not Interested',
  SPAM = 'Spam',
  OUT_OF_OFFICE = 'Out of Office',
  UNCATEGORIZED = 'Uncategorized'
}

export interface IMAPConfig {
  id: string;
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

export interface SearchQuery {
  query?: string;
  folder?: string;
  accountId?: string;
  category?: EmailCategory;
  from?: number;
  size?: number;
}

export interface SuggestedReply {
  email: Email;
  suggestedReply: string;
  confidence: number;
}