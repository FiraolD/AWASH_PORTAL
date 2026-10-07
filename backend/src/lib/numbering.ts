import pool from './db.js';

const pad = (num: number) => num.toString().padStart(6, '0');

export async function generateCode(
  prefix: string,
  productCode: string,
  table: string,
  column: string
): Promise<string> {
  const yy = new Date().getFullYear().toString().slice(-2);
  const prod = (productCode || 'GEN').toUpperCase();
  const likePattern = `${prefix}/${prod}/%/${yy}`;

  const result = await pool.query(
    `SELECT COUNT(*)::int as cnt FROM ${table} WHERE ${column} LIKE $1`,
    [likePattern]
  );

  const seq = (result.rows?.[0]?.cnt || 0) + 1;
  return `${prefix}/${prod}/${pad(seq)}/${yy}`;
}

export async function generateTicketNumber(): Promise<string> {
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = 'TTD';
  const likePattern = `${prefix}/%/${yy}`;

  const result = await pool.query(
    `SELECT COUNT(*)::int as cnt FROM support_tickets WHERE "ticketNumber" LIKE $1`,
    [likePattern]
  );

  const seq = (result.rows?.[0]?.cnt || 0) + 1;
  return `${prefix}/${pad(seq)}/${yy}`;
}

export async function generateClaimNumber(productCode: string): Promise<string> {
  return generateCode('CLND', productCode, 'claims', '"claimNumber"');
}

export async function generatePolicyNumber(productCode: string): Promise<string> {
  return generateCode('AICD', productCode, 'policies', '"policyNumber"');
}

export default generateCode;