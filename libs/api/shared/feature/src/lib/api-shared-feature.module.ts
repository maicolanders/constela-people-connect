import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { ClsUserInterceptor } from './interceptors/cls-user.interceptor';
import { SensitiveFieldsInterceptor } from './interceptors/sensitive-fields.interceptor';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    SyncModule,
  ],
  providers: [
    AuditSubscriber,
    { provide: APP_INTERCEPTOR, useClass: ClsUserInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SensitiveFieldsInterceptor },
  ],
  exports: [SyncModule],
})
export class ApiSharedFeatureModule {}
