import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';

export function createRoutes(emailController: EmailController): Router {
  const router = Router();

  //nails
  router.get('/emails', (req, res) => emailController.searchEmails(req, res));

  //by id
  router.get('/emails/:id', (req, res) => emailController.getEmailById(req, res));

  //acc to replies
  router.get('/emails/:id/reply', (req, res) => emailController.generateReply(req, res));

  //acc to category
  router.put('/emails/:id/category', (req, res) => emailController.updateCategory(req, res));

  //stats wise
  router.get('/statistics', (req, res) => emailController.getStatistics(req, res));

  //health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Email Sync System is running',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}