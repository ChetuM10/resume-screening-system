/**
 * Robust Route Mounting and Availability Tests
 */
const request = require('supertest');
const app = require('../../server');

describe('Express Route Mounting and Response Tests', () => {
  // Critical routes that must be available
  const criticalRoutes = [
    { path: '/', name: 'Home Page' },
    { path: '/api/stats', name: 'API Stats' },
    { path: '/api/resumes', name: 'API Resumes' },
    { path: '/upload', name: 'Upload Page' },
    { path: '/screening', name: 'Screening Page' }
  ];

  beforeAll(async () => {
    // Ensure app is properly initialized
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  describe('Router Stack Validation', () => {
    it('should have Express router with mounted routes', () => {
      expect(app._router).toBeDefined();
      const stackLength = app._router.stack?.length || 0;
      console.log(`📊 Express router stack contains ${stackLength} layers`);
      expect(stackLength).toBeGreaterThan(0);
    });

    it('should have middleware and routes properly configured', () => {
      const middlewareCount = app._router.stack.filter(layer => 
        layer.handle && typeof layer.handle === 'function'
      ).length;
      console.log(`🔧 Found ${middlewareCount} middleware/route handlers`);
      expect(middlewareCount).toBeGreaterThan(0);
    });
  });

  describe('Critical Route Availability', () => {
    test.each(criticalRoutes)(
      'GET $path ($name) should respond with non-404 status',
      async ({ path, name }) => {
        const response = await request(app).get(path);
        console.log(`🌐 ${name} (${path}): ${response.status}`);
        
        expect(response.status).not.toBe(404);
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    );
  });

  describe('Home Page Validation', () => {
    it('should render home page with expected content', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
      
      // Check for keywords that should be present in a resume screening app
      const keywords = ['resume', 'screening', 'upload', 'candidate'];
      const hasKeyword = keywords.some(keyword => 
        response.text.toLowerCase().includes(keyword)
      );
      
      expect(hasKeyword).toBe(true);
      console.log('✅ Home page contains expected resume-related content');
    });
  });

  describe('API Endpoint Validation', () => {
    it('should return JSON from /api/stats with correct structure', async () => {
      const response = await request(app).get('/api/stats');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
      
      // Validate expected API response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('stats');
      
      console.log('✅ /api/stats returns valid JSON structure');
    });

    it('should return JSON from /api/resumes with pagination', async () => {
      const response = await request(app).get('/api/resumes');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('resumes');
      expect(response.body.data).toHaveProperty('pagination');
      
      console.log('✅ /api/resumes returns valid JSON with pagination');
    });
  });

  describe('Upload Route Validation', () => {
    it('should render upload page or return upload info', async () => {
      const response = await request(app).get('/upload');
      
      expect(response.status).toBe(200);
      
      // Could be HTML or JSON depending on implementation
      if (response.headers['content-type']?.includes('json')) {
        expect(response.body).toBeDefined();
        console.log('✅ /upload returns JSON configuration');
      } else {
        expect(response.text).toBeDefined();
        expect(response.text.toLowerCase()).toMatch(/upload|resume|file/);
        console.log('✅ /upload renders HTML page');
      }
    });
  });

  describe('Error Route Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const nonExistentRoutes = [
        '/non-existent-page',
        '/api/invalid-endpoint',
        '/random/path/that/should/not/exist'
      ];

      for (const route of nonExistentRoutes) {
        const response = await request(app).get(route);
        console.log(`🚫 ${route}: ${response.status}`);
        expect(response.status).toBe(404);
        
        // Check if error response has expected structure
        if (response.headers['content-type']?.includes('json')) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
        }
      }
    });
  });

  describe('Route Performance Check', () => {
    it('should respond to critical routes within reasonable time', async () => {
      const startTime = Date.now();
      
      await Promise.all([
        request(app).get('/'),
        request(app).get('/api/stats'),
        request(app).get('/upload')
      ]);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️  All critical routes responded in ${totalTime}ms`);
      
      // Should respond within 5 seconds for all routes combined
      expect(totalTime).toBeLessThan(5000);
    }, 10000);
  });

  describe('HTTP Method Support', () => {
    it('should support GET method on all routes', async () => {
      for (const { path } of criticalRoutes) {
        const response = await request(app).get(path);
        // GET should never return 405 Method Not Allowed
        expect(response.status).not.toBe(405);
      }
    });

    it('should handle POST requests appropriately', async () => {
      // Test POST on upload route (common for file uploads)
      const response = await request(app).post('/upload');
      
      // Should not be 404 (route exists) but might be 400/422 for missing data
      expect(response.status).not.toBe(404);
      console.log(`📤 POST /upload: ${response.status}`);
    });
  });
});
