import request from 'supertest';
import app from '../../app.js';

export async function createTestUser(
    overrides?: Partial<{
        email: string;
        username: string;
        password: string;
    }>,
) {
    const userData = {
        email: overrides?.email ?? 'test@example.com',
        username: overrides?.username ?? 'Test User',
        password: overrides?.password ?? 'testpassword123',
    };

    const res = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

    return {
        user: res.body.user,
        accessToken: res.body.accessToken,
        cookies: res.headers['set-cookie'] ?? [],
        userData,
    };
}
