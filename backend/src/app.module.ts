import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { AiModule } from './ai/ai.module';
import { StagesModule } from './stages/stages.module';
import { ActivitiesModule } from './activities/activities.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Base en la nube (Supabase u otro PostgreSQL administrado): DATABASE_URL
        // y DB_SSL=true. Sin DATABASE_URL se usa el contenedor local de Docker.
        const url = config.get<string>('DATABASE_URL');
        const useSsl = config.get<string>('DB_SSL') === 'true';
        const connection = url
          ? { url }
          : {
              host: config.get<string>('DB_HOST', '127.0.0.1'),
              port: parseInt(config.get<string>('DB_PORT', '5433'), 10),
              username: config.get<string>('DB_USERNAME', 'postgres'),
              password: config.get<string>('DB_PASSWORD', 'password'),
              database: config.get<string>('DB_NAME', 'flowstep_db'),
            };
        return {
          type: 'postgres' as const,
          ...connection,
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          // El esquema se administra mediante los scripts versionados de database/.
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        };
      },
    }),
    UsersModule,
    AuthModule,
    GoalsModule,
    AiModule,
    StagesModule,
    ActivitiesModule,
    AvailabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
