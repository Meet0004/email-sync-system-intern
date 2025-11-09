import { Request, Response } from 'express';
import { ElasticsearchService } from '../services/elasticsearch.service';
import { RAGService } from '../services/rag.service';
import { SearchQuery, EmailCategory } from '../types';

export class EmailController {
  constructor(
    private elasticsearchService: ElasticsearchService,
    private ragService: RAGService
  ) {}

  async searchEmails(req: Request, res: Response): Promise<void> {
    try {
      const query: SearchQuery = {
        query: req.query.query as string,
        folder: req.query.folder as string,
        accountId: req.query.accountId as string,
        category: req.query.category as EmailCategory,
        from: parseInt(req.query.from as string) || 0,
        size: parseInt(req.query.size as string) || 900
      };

      const emails = await this.elasticsearchService.searchEmails(query);
      
      res.json({
        success: true,
        count: emails.length,
        emails
      });
    } catch (error) {
      console.error('Error searching emails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search emails'
      });
    }
  }

  async getEmailById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const email = await this.elasticsearchService.getEmailById(id);

      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found'
        });
        return;
      }

      res.json({
        success: true,
        email
      });
    } catch (error) {
      console.error('Error fetching email:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch email'
      });
    }
  }

  async generateReply(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const email = await this.elasticsearchService.getEmailById(id);

      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found'
        });
        return;
      }

      const suggestedReply = await this.ragService.generateReply(email);

      res.json({
        success: true,
        email,
        suggestedReply,
        confidence: 0.85
      });
    } catch (error) {
      console.error('Error generating reply:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate reply'
      });
    }
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const allEmails = await this.elasticsearchService.searchEmails({});
      
      const stats = {
        total: allEmails.length,
        byCategory: {} as Record<string, number>,
        byAccount: {} as Record<string, number>,
        byFolder: {} as Record<string, number>
      };

      allEmails.forEach(email => {
        // acc to category
        const category = email.category || 'Uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // account wise
        stats.byAccount[email.accountId] = (stats.byAccount[email.accountId] || 0) + 1;

        // folder wise
        stats.byFolder[email.folder] = (stats.byFolder[email.folder] || 0) + 1;
      });

      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { category } = req.body;

      if (!Object.values(EmailCategory).includes(category)) {
        res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
        return;
      }

      await this.elasticsearchService.updateEmailCategory(id, category);

      res.json({
        success: true,
        message: 'Category updated successfully'
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update category'
      });
    }
  }
}