import request from 'supertest';
import type { Server } from 'http';

export async function deleteAllUsers(server: Server): Promise<void> {
  const response = await request(server).get('/users');

  const userIds: string[] = Array.isArray(response.body?.data)
    ? response.body.data.map((user: { id: string }) => user.id)
    : [];

  for (const userId of userIds) {
    const res = await request(server).delete(`/users/${userId}`);
    if (res.status !== 204 && res.status !== 404) {
      throw new Error(`Failed to delete user ${userId}: ${res.status}`);
    }
  }
}
