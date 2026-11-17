import { Global, Module } from '@nestjs/common';
import { TransactionRunner } from './transaction';

/** أدوات مشتركة لكل الموديولات (المرحلة 4) */
@Global()
@Module({ providers: [TransactionRunner], exports: [TransactionRunner] })
export class CommonModule {}
