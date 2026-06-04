import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthentificationModule } from './modules/authentification/authentification.module';
import { UtilisateursModule } from './modules/utilisateurs/utilisateurs.module';
import { PaiementsModule } from './modules/paiements/paiements.module';
import { RechercheModule } from './modules/recherche/recherche.module';
import { EmailModule } from './modules/email/email.module';
import { ChatModule } from './modules/chat/chat.module';
import { ImagesModule } from './modules/images/images.module';
import { ProduitsModule } from './modules/produits/produits.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommandesModule } from './modules/commandes/commandes.module';
import { ContactModule } from './modules/contact/contact.module';
import { AdressesModule } from './modules/adresses/adresses.module';
import { AvisModule } from './modules/avis/avis.module';
import { CarrouselModule } from './modules/carrousel/carrousel.module';
import { TableauDeBordModule } from './modules/tableau-de-bord/tableau-de-bord.module';
import { ParametresSiteModule } from './modules/parametres-site/parametres-site.module';
import { FacturesModule } from './modules/factures/factures.module';
import { FraisPortModule } from './modules/frais-port/frais-port.module';
import { TraductionModule } from './modules/traduction/traduction.module';
import { PanierModule } from './modules/panier/panier.module';
import { CsrfModule } from './modules/csrf/csrf.module';
import { PrismaModule } from './prisma/prisma.module';
import { SanteController } from './sante.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting (applied globally via APP_GUARD)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 60,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 300,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 1000,
      },
    ]),

    // MongoDB — requis pour le stockage des images produits et le chat
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27018/althea'),

    PrismaModule,
    TraductionModule,
    AuthentificationModule,
    UtilisateursModule,
    PaiementsModule,
    RechercheModule,
    EmailModule,
    ChatModule,
    ImagesModule,
    ProduitsModule,
    CategoriesModule,
    CommandesModule,
    ContactModule,
    AdressesModule,
    AvisModule,
    CarrouselModule,
    TableauDeBordModule,
    ParametresSiteModule,
    FacturesModule,
    FraisPortModule,
    PanierModule,
    CsrfModule,
  ],
  controllers: [SanteController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
