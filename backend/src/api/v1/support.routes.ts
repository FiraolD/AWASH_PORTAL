import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// ==================== GET TICKETS ====================

// Get all tickets for admin view (CUSTOMER_ADMIN, MASTER_ADMIN)
router.get('/admin/tickets', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req: AuthRequest, res) => {
    try {
        const query = `
            SELECT 
                t.id,
                t."ticketNumber",
                t.subject,
                t.message as description,
                t.priority,
                t.status,
                t."createdAt",
                t."updatedAt",
                u."firstName" || ' ' || u."lastName" as "customerName",
                u.email as "customerEmail",
                u.phone as "customerPhone",
                (
                    SELECT COUNT(*) 
                    FROM support_responses r 
                    WHERE r."ticketId" = t.id
                ) as "responseCount"
            FROM support_tickets t
            LEFT JOIN users u ON t."userId" = u.id
            ORDER BY t."createdAt" DESC
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Get tickets for the logged-in user (customers see their own)
router.get('/tickets', authenticate, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { status, priority } = req.query;

        let query = `
            SELECT 
                t.id,
                t."ticketNumber",
                t.subject,
                t.message as description,
                t.priority,
                t.status,
                t."createdAt",
                t."updatedAt",
                (
                    SELECT COUNT(*) 
                    FROM support_responses r 
                    WHERE r."ticketId" = t.id AND r."isInternal" = false
                ) as "responseCount"
            FROM support_tickets t
        `;

        const queryParams: any[] = [];
        let paramIndex = 1;

        // If customer, only show their own tickets
        if (userRole === 'CUSTOMER') {
            query += ` WHERE t."userId" = $${paramIndex}`;
            queryParams.push(userId);
            paramIndex++;
        }

        if (status) {
            query += `${queryParams.length > 0 ? ' AND' : ' WHERE'} t.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        if (priority) {
            query += `${queryParams.length > 0 ? ' AND' : ' WHERE'} t.priority = $${paramIndex}`;
            queryParams.push(priority);
            paramIndex++;
        }

        query += ` ORDER BY t."createdAt" DESC`;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Get single ticket details
router.get('/tickets/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        let ticketQuery = `
            SELECT 
                t.id,
                t."ticketNumber",
                t.subject,
                t.message as description,
                t.priority,
                t.status,
                t."createdAt",
                t."updatedAt",
                t."userId",
                u."firstName" || ' ' || u."lastName" as "customerName",
                u.email as "customerEmail",
                u.phone as "customerPhone"
            FROM support_tickets t
            LEFT JOIN users u ON t."userId" = u.id
            WHERE t.id = $1
        `;

        // Non-admins can only see their own tickets
        if (userRole === 'CUSTOMER') {
            ticketQuery += ` AND t."userId" = $2`;
            const ticketResult = await pool.query(ticketQuery, [id, userId]);
            
            if (ticketResult.rows.length === 0) {
                return res.status(404).json({ error: 'Ticket not found' });
            }
            
            const ticket = ticketResult.rows[0];
            
            // Get responses (only non-internal for customers)
            const responsesQuery = `
                SELECT 
                    r.id,
                    r.message,
                    r."isInternal" as "isFromAdmin",
                    r."createdAt",
                    u."firstName" || ' ' || u."lastName" as "userName"
                FROM support_responses r
                LEFT JOIN users u ON r."userId" = u.id
                WHERE r."ticketId" = $1 AND r."isInternal" = false
                ORDER BY r."createdAt" ASC
            `;
            
            const responsesResult = await pool.query(responsesQuery, [id]);
            ticket.responses = responsesResult.rows;
            
            return res.json(ticket);
        }

        // For admins (CUSTOMER_ADMIN, MASTER_ADMIN)
        const ticketResult = await pool.query(ticketQuery, [id]);
        
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketResult.rows[0];
        
        // Get all responses for admins (including internal)
        const responsesQuery = `
            SELECT 
                r.id,
                r.message,
                r."isInternal" as "isFromAdmin",
                r."createdAt",
                u."firstName" || ' ' || u."lastName" as "userName"
            FROM support_responses r
            LEFT JOIN users u ON r."userId" = u.id
            WHERE r."ticketId" = $1
            ORDER BY r."createdAt" ASC
        `;
        
        const responsesResult = await pool.query(responsesQuery, [id]);
        ticket.responses = responsesResult.rows;
        
        res.json(ticket);
    } catch (error) {
        console.error('Failed to fetch ticket details:', error);
        res.status(500).json({ error: 'Failed to fetch ticket details' });
    }
});

// ==================== CREATE TICKET ====================

// Create new support ticket (customers only)
router.post('/tickets', authenticate, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        
        // Only customers can create tickets
        if (userRole !== 'CUSTOMER') {
            return res.status(403).json({ error: 'Only customers can create support tickets' });
        }
        
        const { subject, message, priority = 'medium', category = 'general' } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        // Generate ticket number
        const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const insertQuery = `
            INSERT INTO support_tickets (
                id, "ticketNumber", "userId", subject, message, priority, 
                category, status, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'open', NOW(), NOW()
            ) RETURNING *
        `;

        const ticketResult = await pool.query(insertQuery, [
            ticketNumber, userId, subject, message, priority, category
        ]);

        const ticket = ticketResult.rows[0];

        // Create initial response
        const responseQuery = `
            INSERT INTO support_responses (
                id, "ticketId", "userId", message, "isInternal", "createdAt"
            ) VALUES (
                gen_random_uuid()::text, $1, $2, $3, false, NOW()
            )
        `;
        
        await pool.query(responseQuery, [ticket.id, userId, `Ticket created: ${message.substring(0, 100)}...`]);

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Failed to create ticket:', error);
        res.status(500).json({ error: 'Failed to create support ticket' });
    }
});

// ==================== UPDATE TICKET ====================

// Update ticket status (CUSTOMER_ADMIN, MASTER_ADMIN only)
router.patch('/tickets/:id/status', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assignedTo } = req.body;
        const userId = req.user!.id;

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        updates.push(`"updatedAt" = NOW()`);
        
        if (status) {
            updates.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }
        
        if (priority) {
            updates.push(`priority = $${paramIndex}`);
            values.push(priority);
            paramIndex++;
        }
        
        if (assignedTo !== undefined) {
            updates.push(`"assignedTo" = $${paramIndex}`);
            values.push(assignedTo);
            paramIndex++;
        }

        values.push(id);

        const updateQuery = `
            UPDATE support_tickets 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const ticketResult = await pool.query(updateQuery, values);
        
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Add system response for status change
        if (status) {
            const responseQuery = `
                INSERT INTO support_responses (
                    id, "ticketId", "userId", message, "isInternal", "createdAt"
                ) VALUES (
                    gen_random_uuid()::text, $1, $2, $3, true, NOW()
                )
            `;
            await pool.query(responseQuery, [id, userId, `Ticket status changed to ${status} by ${req.user!.email}`]);
        }

        res.json({ 
            message: 'Status updated successfully',
            ticket: ticketResult.rows[0]
        });
    } catch (error) {
        console.error('Failed to update ticket status:', error);
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
});

// Add response to ticket
router.post('/tickets/:id/responses', authenticate, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { message, isInternal = false } = req.body;
        const userRole = req.user!.role;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Check if ticket exists and user has access
        let checkQuery = `SELECT * FROM support_tickets WHERE id = $1`;
        let checkParams = [id];
        
        if (userRole === 'CUSTOMER') {
            checkQuery += ` AND "userId" = $2`;
            checkParams.push(userId);
        }
        
        const ticketCheck = await pool.query(checkQuery, checkParams);
        
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketCheck.rows[0];

        // Determine if response is internal
        const isInternalResponse = userRole !== 'CUSTOMER' ? isInternal : false;

        // Insert response
        const responseQuery = `
            INSERT INTO support_responses (
                id, "ticketId", "userId", message, "isInternal", "createdAt"
            ) VALUES (
                gen_random_uuid()::text, $1, $2, $3, $4, NOW()
            ) RETURNING *
        `;
        
        const responseResult = await pool.query(responseQuery, [id, userId, message, isInternalResponse]);
        
        // Update ticket status
        if (userRole === 'CUSTOMER') {
            // Customer reply - mark as in_progress
            await pool.query(`
                UPDATE support_tickets 
                SET "updatedAt" = NOW(), status = 'in_progress' 
                WHERE id = $1 AND status = 'open'
            `, [id]);
        } else {
            // Admin reply - update timestamp only
            await pool.query(`
                UPDATE support_tickets 
                SET "updatedAt" = NOW()
                WHERE id = $1
            `, [id]);
        }

        // Get user info for response
        const userQuery = `SELECT "firstName", "lastName", role FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);
        
        const response = responseResult.rows[0];
        response.user = userResult.rows[0];

        res.status(201).json(response);
    } catch (error) {
        console.error('Failed to add response:', error);
        res.status(500).json({ error: 'Failed to add response' });
    }
});

// ==================== DELETE TICKET ====================

// Delete ticket (MASTER_ADMIN only)
router.delete('/tickets/:id', authenticate, authorize('MASTER_ADMIN'), async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        // Delete responses first (due to foreign key constraint)
        await pool.query(`DELETE FROM support_responses WHERE "ticketId" = $1`, [id]);
        
        // Delete ticket
        const result = await pool.query(`DELETE FROM support_tickets WHERE id = $1 RETURNING id`, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

// ==================== STATISTICS ====================

// Get ticket statistics for dashboard (CUSTOMER_ADMIN, MASTER_ADMIN)
router.get('/stats', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req: AuthRequest, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'open') as "openTickets",
                COUNT(*) FILTER (WHERE status = 'in_progress') as "inProgressTickets",
                COUNT(*) FILTER (WHERE status = 'resolved') as "resolvedTickets",
                COUNT(*) FILTER (WHERE status = 'closed') as "closedTickets",
                COUNT(*) FILTER (WHERE priority = 'high') as "highPriorityTickets",
                COUNT(*) FILTER (WHERE priority = 'medium') as "mediumPriorityTickets",
                COUNT(*) FILTER (WHERE priority = 'low') as "lowPriorityTickets"
            FROM support_tickets
        `;
        
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to fetch ticket stats:', error);
        res.status(500).json({ error: 'Failed to fetch ticket statistics' });
    }
});

export default router;