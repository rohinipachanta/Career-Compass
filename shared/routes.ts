import { z } from 'zod';
import { insertUserSchema, insertAchievementSchema, achievements, users } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  conflict: z.object({ message: z.string() }),
  limitReached: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: insertUserSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    user: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    }
  },
  achievements: {
    list: {
      method: 'GET' as const,
      path: '/api/achievements',
      responses: {
        200: z.array(z.custom<typeof achievements.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/achievements',
      input: insertAchievementSchema,
      responses: {
        201: z.custom<typeof achievements.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getCoaching: {
      method: 'POST' as const,
      path: '/api/achievements/:id/coaching',
      responses: {
        200: z.object({ coachingResponse: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.limitReached,
        404: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
