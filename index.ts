import express from 'express';
import cors from 'cors';
import dataRoutes from './src/routes/data';

const app = express();

app.use(cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

app.use(express.json());

app.use("/", dataRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server running'))