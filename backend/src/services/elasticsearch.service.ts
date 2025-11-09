import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { Email, SearchQuery } from '../types';

export class ElasticsearchService {
  private client: Client;
  private indexName = config.elasticsearch.index;

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.url
    });
  }

  async initialize(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                accountId: { type: 'keyword' },
                folder: { type: 'keyword' },
                from: { type: 'text' },
                to: { type: 'keyword' },
                subject: { type: 'text' },
                body: { type: 'text' },
                html: { type: 'text' },
                date: { type: 'date' },
                uid: { type: 'integer' },
                category: { type: 'keyword' }
              }
            }
          }
        });
        console.log('Elasticsearch index created');
      }
    } catch (error) {
      console.error('Error initializing Elasticsearch:', error);
      throw error;
    }
  }

  async indexEmail(email: Email): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: email
      });
    } catch (error) {
      console.error('Error indexing email:', error);
      throw error;
    }
  }

  async searchEmails(query: SearchQuery): Promise<Email[]> {
    try {
      const must: any[] = [];

      if (query.query) {
        must.push({
          multi_match: {
            query: query.query,
            fields: ['subject^3', 'body^2', 'from']
          }
        });
      }

      if (query.folder) {
        must.push({ term: { folder: query.folder } });
      }

      if (query.accountId) {
        must.push({ term: { accountId: query.accountId } });
      }

      if (query.category) {
        must.push({ term: { category: query.category } });
      }

      const searchQuery = must.length > 0 ? { bool: { must } } : { match_all: {} };

      const result = await this.client.search({
        index: this.indexName,
        body: {
          query: searchQuery,
          from: query.from || 0,
          size: query.size || 990,
          sort: [{ date: { order: 'desc' } }]
        }
      });

      return result.hits.hits.map((hit: any) => hit._source as Email);
    } catch (error) {
      console.error('Error searching emails:', error);
      throw error;
    }
  }

  async updateEmailCategory(emailId: string, category: string): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id: emailId,
        body: {
          doc: { category }
        }
      });
    } catch (error) {
      console.error('Error updating email category:', error);
      throw error;
    }
  }

  async getEmailById(emailId: string): Promise<Email | null> {
    try {
      const result = await this.client.get({
        index: this.indexName,
        id: emailId
      });
      return result._source as Email;
    } catch (error) {
      return null;
    }
  }
}