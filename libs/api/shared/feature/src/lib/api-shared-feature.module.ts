import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { ClsUserInterceptor } from './interceptors/cls-user.interceptor';
import { SensitiveFieldsInterceptor } from './interceptors/sensitive-fields.interceptor';
import { PeriodoCierreHookRegistry } from './periodo-cierre/periodo-cierre-hook-registry';
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
    PeriodoCierreHookRegistry,
    { provide: APP_INTERCEPTOR, useClass: ClsUserInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SensitiveFieldsInterceptor },
  ],
  exports: [SyncModule, PeriodoCierreHookRegistry],
})
export class ApiSharedFeatureModule {}
