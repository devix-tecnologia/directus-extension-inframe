import { defineEndpoint } from '@directus/extensions-sdk';

export default defineEndpoint((router) => {
  router.get('/', async (req: any, res) => {
    try {
      const accountability = req.accountability;

      if (!accountability || !accountability.user) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      // Return the token from accountability
      // In Directus, the accountability object contains the access token
      const token = (accountability as any).token || req.token;

      if (!token) {
        return res.status(404).json({
          error: 'Token not found',
        });
      }

      return res.json({
        data: {
          access_token: token,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  });
});
