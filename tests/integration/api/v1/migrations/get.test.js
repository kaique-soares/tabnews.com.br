import { version as uuidVersion } from 'uuid';

import orchestrator from 'tests/orchestrator.js';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe('GET /api/v1/migrations', () => {
  describe('Anonymous user', () => {
    test('Retrieving pending migrations', async () => {
      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/migrations`);

      const responseBody = await response.json();

      expect.soft(response.status).toBe(403);
      expect(responseBody.name).toBe('ForbiddenError');
      expect(responseBody.message).toBe('Usuário não pode executar esta operação.');
      expect(responseBody.action).toBe('Verifique se este usuário possui a feature "read:migration".');
      expect.soft(responseBody.status_code).toBe(403);
      expect(uuidVersion(responseBody.error_id)).toBe(4);
      expect(uuidVersion(responseBody.request_id)).toBe(4);
      expect(responseBody.error_location_code).toBe('MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND');
    });
  });

  describe('Default user', () => {
    test('Retrieving pending migrations', async () => {
      let defaultUser = await orchestrator.createUser();
      defaultUser = await orchestrator.activateUser(defaultUser);
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/migrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          cookie: `session_id=${defaultUserSession.token}`,
        },
      });

      const responseBody = await response.json();

      expect.soft(response.status).toBe(403);
      expect(responseBody.name).toBe('ForbiddenError');
      expect(responseBody.message).toBe('Usuário não pode executar esta operação.');
      expect(responseBody.action).toBe('Verifique se este usuário possui a feature "read:migration".');
      expect.soft(responseBody.status_code).toBe(403);
      expect(uuidVersion(responseBody.error_id)).toBe(4);
      expect(uuidVersion(responseBody.request_id)).toBe(4);
      expect(responseBody.error_location_code).toBe('MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND');
    });
  });

  describe('User with "read:migration" feature', () => {
    let privilegedUser;
    let privilegedUserSession;

    beforeEach(async () => {
      privilegedUser = await orchestrator.createUser();
      privilegedUser = await orchestrator.activateUser(privilegedUser);
      privilegedUser = await orchestrator.addFeaturesToUser(privilegedUser, ['read:migration']);
      privilegedUserSession = await orchestrator.createSession(privilegedUser);
    });

    test('Retrieving pending migrations', async () => {
      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/migrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          cookie: `session_id=${privilegedUserSession.token}`,
        },
      });

      const responseBody = await response.json();

      expect.soft(response.status).toBe(200);
      expect(Array.isArray(responseBody)).toBe(true);
    });

    describe('Same user after losing "read:migration" feature', () => {
      test('Retrieving pending migrations', async () => {
        await orchestrator.removeFeaturesFromUser(privilegedUser, ['read:migration']);

        const responseAfter = await fetch(`${orchestrator.webserverUrl}/api/v1/migrations`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            cookie: `session_id=${privilegedUserSession.token}`,
          },
        });

        const responseBody = await responseAfter.json();

        expect(responseAfter.status).toBe(403);
        expect(responseBody.name).toBe('ForbiddenError');
        expect(responseBody.message).toBe('Usuário não pode executar esta operação.');
        expect(responseBody.action).toBe('Verifique se este usuário possui a feature "read:migration".');
        expect.soft(responseBody.status_code).toBe(403);
        expect(uuidVersion(responseBody.error_id)).toBe(4);
        expect(uuidVersion(responseBody.request_id)).toBe(4);
        expect(responseBody.error_location_code).toBe('MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND');
      });
    });
  });
});
