import { Module } from '@nestjs/common';
import { SyncHandlerRegistry } from './sync-handler-registry';
import { SyncController } from './sync.controller';

@Module({
  controllers: [SyncController],
  providers: [SyncHandlerRegistry],
  exports: [SyncHandlerRegistry],
})
export class SyncModule {}
