import axios from 'axios';
import { config } from '../config';
import { Email, EmailCategory } from '../types';

export class NotificationService {
  
  async sendSlackNotification(email: Email): Promise<void> {
    if (!config.slack.webhookUrl) {
      console.log('Slack webhook URL not configured');
      return;
    }

    try {
      const message = {
        text: ` New Interested Email!`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: ' New Interested Email Received'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*From:*\n${email.from}`
              },
              {
                type: 'mrkdwn',
                text: `*Account:*\n${email.accountId}`
              },
              {
                type: 'mrkdwn',
                text: `*Subject:*\n${email.subject}`
              },
              {
                type: 'mrkdwn',
                text: `*Date:*\n${new Date(email.date).toLocaleString()}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Preview:*\n${email.body.substring(0, 200)}...`
            }
          }
        ]
      };

      await axios.post(config.slack.webhookUrl, message);
      console.log('Slack notification sent successfully');
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  async triggerWebhook(email: Email): Promise<void> {
    if (!config.webhook.url) {
      console.log('Webhook URL not configured');
      return;
    }

    try {
      const payload = {
        event: 'email.interested',
        timestamp: new Date().toISOString(),
        data: {
          emailId: email.id,
          accountId: email.accountId,
          from: email.from,
          subject: email.subject,
          body: email.body.substring(0, 500),
          date: email.date,
          category: email.category
        }
      };

      await axios.post(config.webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Webhook triggered successfully');
    } catch (error) {
      console.error('Error triggering webhook:', error);
    }
  }

  async notifyInterestedEmail(email: Email): Promise<void> {
    if (email.category === EmailCategory.INTERESTED) {
      await Promise.all([
        this.sendSlackNotification(email),
        this.triggerWebhook(email)
      ]);
    }
  }
}