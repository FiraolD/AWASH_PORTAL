import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSql } from '../src/api/v1/admin-sql.routes.js';

test('accepts a basic SELECT and classifies it as read-only', () => {
  assert.deepEqual(normalizeSql('SELECT id, name FROM users'), {
    sql: 'SELECT id, name FROM users',
    operation: 'SELECT',
  });
});

test('accepts a read-only CTE', () => {
  assert.deepEqual(normalizeSql('WITH active_users AS (SELECT id FROM users) SELECT id FROM active_users'), {
    sql: 'WITH active_users AS (SELECT id FROM users) SELECT id FROM active_users',
    operation: 'SELECT',
  });
});

test('accepts INSERT only when RETURNING is present', () => {
  assert.equal(normalizeSql("INSERT INTO users (name) VALUES ('Test') RETURNING id").operation, 'INSERT');
  assert.throws(() => normalizeSql("INSERT INTO users (name) VALUES ('Test')"), /RETURNING/i);
});

test('accepts UPDATE only with WHERE and RETURNING', () => {
  assert.equal(normalizeSql("UPDATE users SET name = 'Test' WHERE id = 1 RETURNING id").operation, 'UPDATE');
  assert.throws(() => normalizeSql("UPDATE users SET name = 'Test' RETURNING id"), /WHERE/i);
  assert.throws(() => normalizeSql("UPDATE users SET name = 'Test' WHERE id = 1"), /RETURNING/i);
});

test('rejects DELETE and other unsupported top-level statements', () => {
  assert.throws(() => normalizeSql('DELETE FROM users RETURNING id'), /Only SELECT, INSERT and UPDATE/i);
  assert.throws(() => normalizeSql('DROP TABLE users'), /Only SELECT, INSERT and UPDATE/i);
});

test('rejects data-modifying CTEs', () => {
  assert.throws(
    () => normalizeSql("WITH changed AS (UPDATE users SET name = 'X' WHERE id = 1 RETURNING id) SELECT * FROM changed"),
    /Data-modifying CTEs/i,
  );
});

test('rejects multiple statements and SQL comments', () => {
  assert.throws(() => normalizeSql('SELECT 1; SELECT 2'), /Only one SQL statement/i);
  assert.throws(() => normalizeSql('SELECT 1 -- comment'), /comments are not supported/i);
});

test('rejects direct audit_logs modification and dangerous functions', () => {
  assert.throws(() => normalizeSql("UPDATE audit_logs SET action = 'x' WHERE id = 1 RETURNING id"), /audit_logs table is protected/i);
  for (const fn of ['nextval', 'pg_notify', 'lo_create', 'pg_advisory_unlock_all', 'pg_sleep']) {
    assert.throws(() => normalizeSql(`SELECT ${fn}('test')`), /function that is not allowed/i);
  }
});

test('rejects SELECT INTO and EXPLAIN', () => {
  assert.throws(() => normalizeSql('SELECT id INTO new_users FROM users'), /SELECT INTO/i);
  assert.throws(() => normalizeSql('EXPLAIN SELECT * FROM users'), /Only SELECT, INSERT and UPDATE/i);
});

test('rejects oversized queries and empty input', () => {
  assert.throws(() => normalizeSql('   '), /Enter a SQL query/i);
  assert.throws(() => normalizeSql('SELECT 1 ' + ' '.repeat(10001)), /character limit/i);
});
