import { Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest } from '../api/middleware/auth.middleware.js';
import { generateTicketNumber } from '../lib/numbering.js';
import { EmailService, sendVerificationEmail } from '../services/email.service.js';

export const SupportController = {
  // Get user's tickets
  getMyTickets: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query(`
        SELECT id, "ticketNumber", subject, priority, status, "createdAt", "updatedAt"
        FROM support_tickets WHERE "userId" = $1 ORDER BY "createdAt" DESC
      `, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  },

  // Get all tickets (admin)
  getAllTickets: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT st.id, st."ticketNumber", st.subject, st.priority, st.status, st."createdAt",
               u."firstName" || ' ' || u."lastName" as customerName, u.email as customerEmail
        FROM support_tickets st
        JOIN users u ON u.id = st."userId"
        ORDER BY st."createdAt" DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  },

  // Create ticket
  createTicket: async (req: AuthRequest, res: Response) => {
    try {
      const { subject, description, priority = 'medium' } = req.body;
      const userId = req.user!.id;

      const ticketNumber = await generateTicketNumber();

      const userResult = await pool.query('SELECT "firstName", "lastName", email FROM users WHERE id = $1', [userId]);

      const result = await pool.query(`
        INSERT INTO support_tickets (id, "ticketNumber", "userId", subject, description, priority, status, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'open', NOW(), NOW())
        RETURNING id, "ticketNumber"
      `, [ticketNumber, userId, subject, description, priority]);

      res.status(201).json({ success: true, message: 'Support ticket created', ticketNumber, ticketId: result.rows[0].id });
    } catch (error) {
      console.error('Failed to create ticket:', error);
      res.status(500).json({ error: 'Failed to create support ticket' });
    }
  },

  // Get ticket details
  getTicketDetails: async (req: AuthRequest, res: Response) => {
    try {
      const { ticketId } = req.params;

      const ticketResult = await pool.query(`
        SELECT st.*, u."firstName" || ' ' || u."lastName" as customerName, u.email as customerEmail
        FROM support_tickets st
        JOIN users u ON u.id = st."userId"
        WHERE st.id = $1
      `, [ticketId]);

      if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

      const responses = await pool.query(`
        SELECT sr.*, u."firstName" || ' ' || u."lastName" as userName
        FROM support_responses sr
        JOIN users u ON u.id = sr."userId"
        WHERE sr."ticketId" = $1 ORDER BY sr."createdAt" ASC
      `, [ticketId]);

      res.json({ ...ticketResult.rows[0], responses: responses.rows });
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  },

  // Add response to ticket
  addResponse: async (req: AuthRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { message } = req.body;
      const userId = req.user!.id;
      const isAdmin = ['MASTER_ADMIN', 'SYSTEM_ADMIN', 'CUSTOMER_ADMIN'].includes(req.user!.role);

      const ticketCheck = await pool.query('SELECT "userId", "ticketNumber" FROM support_tickets WHERE id = $1', [ticketId]);
      if (ticketCheck.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

      await pool.query(`
        INSERT INTO support_responses (id, "ticketId", "userId", message, "isFromAdmin", "createdAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      `, [ticketId, userId, message, isAdmin]);

      res.json({ success: true, message: 'Response added' });
    } catch (error) {
      console.error('Failed to add response:', error);
      res.status(500).json({ error: 'Failed to add response' });
    }
  },

  // Update ticket status
  updateTicketStatus: async (req: AuthRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      await pool.query('UPDATE support_tickets SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, ticketId]);
      res.json({ message: `Ticket ${status} successfully` });
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      res.status(500).json({ error: 'Failed to update ticket status' });
    }
  },
};