import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Express + TypeScript on Vercel');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
