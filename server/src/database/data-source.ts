import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm-options';

/** يستخدمه TypeORM CLI: npm run migration:run / migration:show / migration:revert */
export default new DataSource(buildDataSourceOptions());
