import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TableauDeBordService } from './tableau-de-bord.service';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGarde)
@Roles('ADMIN', 'MANAGER_PRODUCTS', 'MANAGER_ORDERS', 'ACCOUNTANT')
@ApiBearerAuth()
export class TableauDeBordController {
  constructor(private readonly dashboardService: TableauDeBordService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs du tableau de bord (admin)' })
  getKpis() {
    return this.dashboardService.getKpis();
  }

  @Get('sales-by-category')
  @ApiOperation({ summary: 'Ventes par catégorie (admin)' })
  getSalesByCategory(@Query('days') days?: string) {
    return this.dashboardService.getSalesByCategory(
      days ? parseInt(days) : 7,
    );
  }

  @Get('stock-alerts')
  @ApiOperation({ summary: 'Alertes de stock (admin)' })
  getStockAlerts(@Query('limit') limit?: string) {
    return this.dashboardService.getStockAlerts(
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Commandes récentes (admin)' })
  getRecentOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Produits les plus vendus (admin)' })
  getTopProducts(
    @Query('limit') limit?: string,
    @Query('days') days?: string,
  ) {
    return this.dashboardService.getTopProducts(
      limit ? parseInt(limit) : 5,
      days ? parseInt(days) : 30,
    );
  }

  @Get('sales-histogram')
  @ApiOperation({ summary: 'Histogramme multi-couches des ventes par catégorie' })
  getSalesHistogram(@Query('days') days?: string) {
    return this.dashboardService.getSalesHistogram(days ? parseInt(days) : 7);
  }
}
