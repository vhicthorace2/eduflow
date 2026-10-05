const request = require('supertest');
const app = require('../backend/server'); // Path to your Express app entry point
const User = require('../backend/models/User'); // Path to your User model

describe('Backend Integration Test Suite', () => {
  // Clean up database before each test to ensure test isolation
  beforeEach(async () => {
    await User.deleteMany({});
    await RoomRequest.deleteMany({});
  });

  // ---------------------------------------------------------------------------
  // 1. User Registration Tests
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/register - User Registration', () => {
    it('should register a new user successfully with valid details', async () => {
      const newUser = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(newUser.email);
      expect(res.body.data).not.toHaveProperty('password'); // Ensure password isn't leaked
    });

    it('should return 400 Bad Request if mandatory fields are missing', async () => {
      const invalidUser = {
        email: 'incomplete@example.com',
        // password omitted
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Duplicate Email Signup Tests
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/register - Duplicate Email Signup', () => {
    it('should reject signup when email is already registered', async () => {
      const existingUser = {
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      };

      // Create initial user
      await request(app).post('/api/auth/register').send(existingUser);

      // Attempt duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another Person',
          email: 'duplicate@example.com',
          password: 'DifferentPassword123!',
        });

      expect(res.statusCode).toEqual(409); // 409 Conflict
      expect(res.body).toHaveProperty('message', 'Email already exists');
    });
  });



  // ---------------------------------------------------------------------------
  // 3. Unauthorized Admin Route Tests
  // ---------------------------------------------------------------------------
  describe('GET /api/admin/dashboard - Unauthorized Admin Access', () => {
    it('should reject access to unauthenticated requests (no token)', async () => {
      const res = await request(app).get('/api/admin/dashboard');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject access to non-admin authenticated users (Forbidden)', async () => {
      // Register standard non-admin user
      const userRes = await request(app).post('/api/auth/register').send({
        name: 'Standard User',
        email: 'standarduser@example.com',
        password: 'Password123!',
        role: 'user', // Non-admin role
      });

      const standardUserToken = userRes.body.token;

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${standardUserToken}`);

      expect(res.statusCode).toEqual(403); // 403 Forbidden
      expect(res.body).toHaveProperty('message', 'Access denied: Admin permissions required');
    });
  });
});